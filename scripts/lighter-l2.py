#!/usr/bin/env python3
"""Lighter L2 helper. Reads LIGHTER_API_PRIVATE_KEY from env. JSON in/out. Never prints the key."""

from __future__ import annotations

import asyncio
import ctypes
import json
import os
import sys
from typing import Any

import lighter
from lighter.signer_client import decode_and_free


def env_key() -> tuple[str, int, int]:
    key = os.environ.get("LIGHTER_API_PRIVATE_KEY", "").strip()
    if key.lower().startswith("0x"):
        key = key[2:]
    if not key:
        raise SystemExit("LIGHTER_API_PRIVATE_KEY is not set")
    idx = int(os.environ.get("LIGHTER_API_KEY_INDEX") or "4")
    account = int(os.environ.get("LIGHTER_ACCOUNT_INDEX") or "747083")
    return key, idx, account


async def client() -> lighter.SignerClient:
    key, idx, account = env_key()
    return lighter.SignerClient(
        url="https://mainnet.zklighter.elliot.ai",
        api_private_keys={idx: key},
        account_index=account,
    )


def sign_transfer_unsigned(
    signer_client: lighter.SignerClient,
    *,
    to_account_index: int,
    asset_id: int,
    route_from: int,
    route_to: int,
    amount: int,
    fee: int,
    memo: str,
    nonce: int,
    api_key_index: int,
) -> dict[str, Any]:
    result = signer_client.signer.SignTransfer(
        to_account_index,
        asset_id,
        route_from,
        route_to,
        amount,
        fee,
        ctypes.c_char_p(memo.encode("utf-8")),
        0,
        nonce,
        api_key_index,
        signer_client.account_index,
    )
    err = decode_and_free(result.err)
    tx_info = decode_and_free(result.txInfo)
    tx_hash = decode_and_free(result.txHash)
    message = decode_and_free(result.messageToSign)
    if err:
        raise RuntimeError(err)
    return {
        "tx_type": result.txType,
        "tx_info": json.loads(tx_info),
        "tx_hash": tx_hash,
        "message_to_sign": message,
    }


async def cmd_check() -> dict[str, Any]:
    signer = await client()
    _, idx, account = env_key()
    err = signer.check_client()
    nonce = await signer.tx_api.next_nonce(account_index=account, api_key_index=idx)
    await signer.close()
    return {
        "ok": err is None,
        "check": err,
        "account_index": account,
        "api_key_index": idx,
        "nonce": getattr(nonce, "nonce", None),
    }


async def cmd_sign(payload: dict[str, Any]) -> dict[str, Any]:
    signer = await client()
    _, idx, account = env_key()
    err = signer.check_client()
    if err:
        await signer.close()
        raise RuntimeError(err)
    nonce_resp = await signer.tx_api.next_nonce(account_index=account, api_key_index=idx)
    nonce = int(payload.get("nonce") or nonce_resp.nonce)
    signed = sign_transfer_unsigned(
        signer,
        to_account_index=int(payload["to_account_index"]),
        asset_id=int(payload.get("asset_id") or 3),
        route_from=int(payload.get("route_from") or 0),
        route_to=int(payload.get("route_to") or 0),
        amount=int(payload["amount"]),
        fee=int(payload["fee"]),
        memo=str(payload["memo"]),
        nonce=nonce,
        api_key_index=idx,
    )
    await signer.close()
    signed["ok"] = True
    signed["nonce"] = nonce
    signed["api_key_index"] = idx
    return signed


async def cmd_send(payload: dict[str, Any]) -> dict[str, Any]:
    signer = await client()
    tx_info = payload["tx_info"]
    if not isinstance(tx_info, dict):
        tx_info = json.loads(tx_info)
    l1_sig = str(payload["l1_sig"])
    if not l1_sig.startswith("0x"):
        l1_sig = "0x" + l1_sig
    tx_info["L1Sig"] = l1_sig
    resp = await signer.send_tx(tx_type=int(payload["tx_type"]), tx_info=json.dumps(tx_info))
    await signer.close()
    if hasattr(resp, "to_dict"):
        body = resp.to_dict()
    elif hasattr(resp, "to_json"):
        body = json.loads(resp.to_json())
    else:
        body = {"repr": str(resp)}
    return {"ok": True, "response": body}


async def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    raw = sys.stdin.read() if not sys.stdin.isatty() else ""
    payload = json.loads(raw) if raw.strip() else {}
    if cmd == "check":
        out = await cmd_check()
    elif cmd == "sign":
        out = await cmd_sign(payload)
    elif cmd == "send":
        out = await cmd_send(payload)
    else:
        raise SystemExit(f"unknown command {cmd}")
    json.dump(out, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    asyncio.run(main())
