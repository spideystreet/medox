"""Jev (TypeSafe) yes/no judge.

Same contract as the Vital evals: a noul probability, yes at 0.5 or above.
A check that starts with "NOT: " inverts the verdict, so a judge that always
says yes fails the calibration cases.
"""

import json
from typing import Any
from urllib.request import Request, urlopen

NOUL_YES = 0.5
JEV_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"


def verdict_from_noul(check: str, noul: float) -> bool:
    """Turn a noul probability into a boolean, honoring a NOT: prefix."""
    negate = check.startswith("NOT: ")
    yes = noul >= NOUL_YES
    return (not yes) if negate else yes


def judge_question(check: str) -> str:
    """Strip the NOT: prefix. The inversion happens after the probability."""
    if check.startswith("NOT: "):
        return check[5:]
    return check


def parse_noul(body: dict[str, Any]) -> float:
    """Read answers.verdict.noul. Raises if the payload is not a probability."""
    answers = body.get("answers")
    verdict = answers.get("verdict") if isinstance(answers, dict) else None
    noul = verdict.get("noul") if isinstance(verdict, dict) else None
    if not isinstance(noul, int | float):
        raise ValueError("Jev returned no noul")
    return float(noul)


def judge(
    check: str,
    question: str,
    answer: str,
    *,
    api_key: str,
    model: str = DEFAULT_MODEL,
) -> bool:
    """Ask Jev whether `answer` satisfies `check`."""
    payload = {
        "model": model,
        "state": {"question": question, "answer": answer},
        "questions": {"verdict": {"type": "noul", "instructions": judge_question(check)}},
    }
    request = Request(
        JEV_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=60) as response:  # noqa: S310
        status = getattr(response, "status", 200)
        raw = response.read().decode()
    if status >= 400:
        raise RuntimeError(f"Jev judge failed ({status})")
    body = json.loads(raw)
    if not isinstance(body, dict):
        raise ValueError("Jev returned no noul")
    return verdict_from_noul(check, parse_noul(body))
