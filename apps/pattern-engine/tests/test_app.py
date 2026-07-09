import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from app import app


def synthetic_closes(n=25):
    # A simple, deterministic uptrend for a query window.
    return [100.0 * (1.01 ** i) for i in range(n)]


def test_health():
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
    print("test_health: PASS")


def test_match_endpoint_returns_real_matches_and_distributions():
    client = TestClient(app)
    r = client.post("/match", json={"closes": synthetic_closes(), "top_k": 10})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "matches" in body and "distributions" in body
    assert len(body["matches"]) > 0, "expected at least one historical match"
    for m in body["matches"]:
        assert "ticker" in m and "outcome" in m
    assert "5" in body["distributions"]
    print(f"test_match_endpoint_returns_real_matches_and_distributions: PASS ({len(body['matches'])} matches)")


def test_classify_endpoint_returns_probabilities_and_accuracy():
    client = TestClient(app)
    r = client.post("/classify", json={"closes": synthetic_closes()})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "horizons" in body
    for horizon, result in body["horizons"].items():
        probs = result["probabilities"]
        total = sum(probs.values())
        assert abs(total - 1.0) < 1e-6, f"probabilities for {horizon}d should sum to ~1.0, got {total}"
        assert 0.0 <= result["backtested_accuracy"] <= 1.0
    print(f"test_classify_endpoint_returns_probabilities_and_accuracy: PASS (horizons={list(body['horizons'].keys())})")


def test_classify_rejects_too_short_query():
    client = TestClient(app)
    r = client.post("/classify", json={"closes": [100.0, 101.0]})
    assert r.status_code == 400
    print("test_classify_rejects_too_short_query: PASS")


if __name__ == "__main__":
    test_health()
    test_match_endpoint_returns_real_matches_and_distributions()
    test_classify_endpoint_returns_probabilities_and_accuracy()
    test_classify_rejects_too_short_query()
    print("\nAll app/API tests passed.")
