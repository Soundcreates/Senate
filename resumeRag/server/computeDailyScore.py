import math

def project_load_factor(p, p_opt=2, p_max=5):
    if p <= p_opt:
        return 1.0
    elif p < p_max:
        return max(1 - 0.15 * (p - p_opt), 0.6)
    else:
        return 0.6


def compute_daily_score(
    commits_today,
    coding_minutes,
    copilot_score,
    tier,
    active_projects
):
    C_MAX = 10
    T_MAX = 480

    commit_score = min(
        math.log(1 + commits_today) / math.log(1 + C_MAX),
        1.0
    )

    time_score = min(coding_minutes / T_MAX, 1.0)

    raw = (
        0.35 * commit_score +
        0.35 * time_score +
        0.30 * copilot_score
    )

    tier_multiplier = {
        "junior": 1.15,
        "mid": 1.0,
        "senior": 0.9
    }.get(tier, 1.0)

    load_factor = project_load_factor(active_projects)

    final_score = raw * tier_multiplier * load_factor * 100
    return round(max(0, min(final_score, 100)), 2)
