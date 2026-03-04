import json
from typing import Any

from ingest import (
    GeminiEmbeddings,
    create_chroma_collection,
    create_gemini_client,
    load_api_key,
)

_embedding_model: GeminiEmbeddings | None = None
_resume_collection = None


def _get_embedding_model() -> GeminiEmbeddings:
    global _embedding_model
    if _embedding_model is None:
        api_key = load_api_key()
        _embedding_model = GeminiEmbeddings(create_gemini_client(api_key))
    return _embedding_model


def _get_resume_collection():
    global _resume_collection
    if _resume_collection is None:
        _resume_collection = create_chroma_collection("resume_embeddings")
    return _resume_collection


def _flatten_first_result(results: dict, key: str) -> list:
    values = results.get(key, [])
    if not values:
        return []
    first = values[0]
    return first if isinstance(first, list) else values


def _build_query_text(query: str, context: Any) -> str:
    if context is None:
        return query
    if isinstance(context, str):
        context_text = context
    else:
        context_text = json.dumps(context, ensure_ascii=False)
    return f"{query}\n\nContext: {context_text}"


def _to_match_score(distance: float | None) -> int:
    if distance is None:
        return 50
    safe_distance = max(float(distance), 0.0)
    score = (1.0 / (1.0 + safe_distance)) * 100.0
    return int(round(max(0.0, min(100.0, score))))


def _build_reason(sections: list[str], snippets: list[str]) -> str:
    section_part = ", ".join(sections) if sections else "general profile"
    if snippets:
        return f"Strong match in sections: {section_part}. Highlight: {snippets[0]}"
    return f"Strong match in sections: {section_part}."


def _build_recommendations_from_results(results: dict, limit: int = 5) -> list[dict[str, Any]]:
    documents = _flatten_first_result(results, "documents")
    metadatas = _flatten_first_result(results, "metadatas")
    distances = _flatten_first_result(results, "distances")

    grouped: dict[str, dict] = {}

    for index, document in enumerate(documents):
        metadata = metadatas[index] if index < len(metadatas) and metadatas[index] else {}
        distance = distances[index] if index < len(distances) else None

        candidate_id = str(
            metadata.get("user_id")
            or metadata.get("source_id")
            or metadata.get("resume")
            or f"candidate_{index + 1}"
        )

        candidate = grouped.setdefault(
            candidate_id,
            {
                "userid": candidate_id,
                "name": candidate_id,
                "best_distance": None,
                "sections": set(),
                "snippets": [],
                "source_ids": set(),
            }
        )

        if distance is not None:
            numeric_distance = float(distance)
            if candidate["best_distance"] is None or numeric_distance < candidate["best_distance"]:
                candidate["best_distance"] = numeric_distance

        section = metadata.get("section")
        if section:
            candidate["sections"].add(str(section))

        source_id = metadata.get("source_id")
        if source_id:
            candidate["source_ids"].add(str(source_id))

        cleaned = " ".join(str(document).split())
        if cleaned and len(candidate["snippets"]) < 2:
            candidate["snippets"].append(cleaned[:220])

    ranked_candidates = sorted(
        grouped.values(),
        key=lambda item: item["best_distance"] if item["best_distance"] is not None else 9999.0
    )

    recommendations = []
    for candidate in ranked_candidates[:limit]:
        sections = sorted(candidate["sections"])
        recommendations.append(
            {
                "userid": candidate["userid"],
                "name": candidate["name"],
                "skills": ", ".join(sections) if sections else "general",
                "match": _to_match_score(candidate["best_distance"]),
                "reason": _build_reason(sections, candidate["snippets"]),
                "sourceIds": sorted(candidate["source_ids"]),
            }
        )

    return recommendations


def fetch_recommendations(
    query: str,
    context: Any = None,
    user_id: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    query_text = _build_query_text(query, context)
    query_embedding = _get_embedding_model().embed_query(query_text)

    collection = _get_resume_collection()
    query_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": 50,
        "include": ["documents", "metadatas", "distances"],
    }

    if user_id:
        query_kwargs["where"] = {"user_id": user_id}

    results = collection.query(**query_kwargs)
    recommendations = _build_recommendations_from_results(results, limit=limit)

    if user_id and not recommendations:
        fallback_results = collection.query(
            query_embeddings=[query_embedding],
            n_results=50,
            include=["documents", "metadatas", "distances"],
        )
        recommendations = _build_recommendations_from_results(fallback_results, limit=limit)

    return recommendations