import math

K_FACTOR = {
    "junior": 40,
    "mid": 25,
    "senior": 15
}

def expected_score(team_rating, task_rating):
    return 1 / (1 + 10 ** ((task_rating - team_rating) / 400))


def update_ratings_after_completion(employees, task_rating):
    team_rating = sum(e["rating"] * e["weight"] for e in employees)
    E = expected_score(team_rating, task_rating)

    updates = []

    for e in employees:
        S = e["avg_task_score"] / 100
        K = K_FACTOR[e["tier"]]

        delta = K * e["weight"] * (S - E)
        new_rating = round(e["rating"] + delta, 2)

        updates.append({
            "employee_id": e["id"],
            "old_rating": e["rating"],
            "rating_change": round(delta, 2),
            "new_rating": new_rating
        })

    return updates
