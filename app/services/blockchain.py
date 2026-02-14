import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "https://rpc.sepolia.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

CHAIN_ID = 11155111  # Sepolia

web3 = Web3(Web3.HTTPProvider(RPC_URL))

CONTRACT_ADDRESS = Web3.to_checksum_address(
    "0x78efd50b1607a9b0a350849202111e6ac7255d50"
)

ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "date", "type": "string"},
            {"internalType": "string", "name": "status", "type": "string"},
            {"internalType": "uint256", "name": "score", "type": "uint256"}
        ],
        "name": "recordAudit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


def write_audit_to_chain(date_str, status, score):

    if not PRIVATE_KEY:
        return "Blockchain disabled (no PRIVATE_KEY)"

    if not web3.is_connected():
        return "Web3 connection failed"

    account = web3.eth.account.from_key(PRIVATE_KEY)
    contract = web3.eth.contract(
        address=CONTRACT_ADDRESS,
        abi=ABI
    )

    try:
        score_int = int(score * 100)

        tx = contract.functions.recordAudit(
            date_str,
            status,
            score_int
        ).build_transaction({
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "gas": 500000,
            "gasPrice": web3.eth.gas_price,
            "chainId": CHAIN_ID
        })

        signed_tx = web3.eth.account.sign_transaction(
            tx,
            PRIVATE_KEY
        )

        tx_hash = web3.eth.send_raw_transaction(
            signed_tx.rawTransaction
        )

        return f"https://sepolia.etherscan.io/tx/{tx_hash.hex()}"

    except Exception as e:
        return f"Blockchain Error: {str(e)}"
