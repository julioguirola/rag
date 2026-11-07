from typing import Optional
from typing_extensions import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langsmith import traceable

from app.config import get_settings
from app.retriever import Retriever


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    error: Optional[str]
    retry_count: int
    model_used: str


class ProductionAgent:
    def __init__(self):
        settings = get_settings()

        self.primary_llm = ChatNVIDIA(
            model=settings.primary_model,
            temperature=0,
            timeout=30,
            api_key=settings.nvidia_api_key,
        )

        self.fallback_llm = ChatNVIDIA(
            model=settings.fallback_model,
            temperature=0,
            timeout=30,
            api_key=settings.nvidia_api_key,
        )
        self.max_retries = settings.max_retries
        self.retriever = Retriever()
        self.graph = self._build_graph()

    def _build_graph(self):
        def process_message(state: AgentState) -> dict:
            try:
                response = self.primary_llm.invoke(state["messages"])
                return {
                    "messages": [response],
                    "error": None,
                    "model_used": "primary",
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "retry_count": state["retry_count"] + 1,
                    "model_used": "",
                }

        def try_fallback(state: AgentState) -> dict:
            try:
                response = self.fallback_llm.invoke(state["messages"])
                return {
                    "messages": [response],
                    "error": None,
                    "model_used": "fallback",
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "model_used": "",
                }

        def handle_error(state: AgentState) -> dict:
            return {
                "messages": [
                    AIMessage(
                        content=(
                            "I'm sorry, I'm having trouble processing your request"
                            "right now. Please try again in a moment."
                        )
                    )
                ],
                "model_used": "error_handler",
            }

        def route_after_process(state: AgentState) -> str:
            if state.get("error") is None:
                return "done"
            elif state["retry_count"] < self.max_retries:
                return "fallback"
            else:
                return "error"

        def route_after_fallback(state: AgentState) -> str:
            """Decide what to do after fallback attempt."""
            if state.get("error") is None:
                return "done"
            else:
                return "error"

        graph = StateGraph(AgentState)

        graph.add_node("process", process_message)
        graph.add_node("fallback", try_fallback)
        graph.add_node("error", handle_error)

        graph.add_edge(START, "process")
        graph.add_conditional_edges(
            "process",
            route_after_process,
            {"done": END, "fallback": "fallback", "error": "error"},
        )
        graph.add_conditional_edges(
            "fallback",
            route_after_fallback,
            {"done": END, "error": "error"},
        )
        graph.add_edge("error", END)

        return graph.compile()

    @traceable(name="production_agent_invoke")
    def invoke(
        self, message: str, conversation_history: list[tuple[str, str]] | None = None
    ) -> dict:
        """
        Invoke the agent with a user message.
        Returns: {"response": str, "model_used": str, "error": str | None}
        """

        retrieved_chunks = self.retriever.retrieve(message)
        context = self.retriever.build_context(retrieved_chunks)
        history = conversation_history or []
        history_text = "\n\n".join(
            f"User: {user_input}\nAssistant: {ai_response}"
            for user_input, ai_response in history
        )
        prompt = (
            "Answer the question based on the following context. \n\n"
            "Do not invent or assume information. Do not begin the conversation saying 'Based on the context...' or similar. If the answer is not in the current context, "
            'say exactly: "No se, no tengo acceso a esa informacion".\n\n'
            f"Previous conversation:\n{history_text or '(none)'}\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {message}\n\n"
            "Answer:"
        )
        result = self.graph.invoke(
            {
                "messages": [HumanMessage(content=prompt)],
                "error": None,
                "retry_count": 0,
                "model_used": "",
            }
        )
        response_message = result["messages"][-1]
        usage = self._extract_usage(response_message)

        return {
            "response": response_message.content,
            "model_used": result.get("model_used", "unknown"),
            "error": result.get("error"),
            "usage": usage,
            "context": [
                {
                    "filename": chunk.filename,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                }
                for chunk in retrieved_chunks
            ],
        }

    @staticmethod
    def _extract_usage(message: BaseMessage) -> dict[str, int] | None:
        """Normalize token usage exposed by different LangChain integrations."""
        usage_metadata = getattr(message, "usage_metadata", None) or {}
        response_metadata = getattr(message, "response_metadata", None) or {}
        token_usage = response_metadata.get("token_usage", {})

        input_tokens = usage_metadata.get("input_tokens")
        if input_tokens is None:
            input_tokens = token_usage.get("prompt_tokens")
        output_tokens = usage_metadata.get("output_tokens")
        if output_tokens is None:
            output_tokens = token_usage.get("completion_tokens")

        if not isinstance(input_tokens, int) or not isinstance(output_tokens, int):
            return None
        return {"input_tokens": input_tokens, "output_tokens": output_tokens}
