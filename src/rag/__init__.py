from langchain_openai import ChatOpenAI
import os


def api_key() -> str:
    return os.environ["NVIDIA_API_KEY"]


def main() -> None:
    llm = ChatOpenAI(
        model="nvidia/nemotron-3-ultra-550b-a55b",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
        temperature=0,
    )

    response = llm.invoke("Say 'setup complete!' in one word")

    print(response)
