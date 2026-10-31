from langchain_nvidia import ChatNVIDIA


def main() -> None:
    llm = ChatNVIDIA(
        model="nvidia/nemotron-3-ultra-550b-a55b",
        temperature=0,
    )

    response = llm.invoke("Say 'setup complete!' in one word")

    print(response)
