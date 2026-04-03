"""
i-VTM (Initial Volunteer-Task Mapping) Optimization Engine

Uses:
1. Cosine Similarity to align volunteer skills with task requirements
2. Integer Linear Program (ILP) via Google OR-Tools to maximize
   long-term retention by avoiding volunteer burnout
"""
import numpy as np
from ortools.linear_solver import pywraplp


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two skill vectors."""
    a = np.array(vec_a, dtype=float)
    b = np.array(vec_b, dtype=float)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def solve_ilp_matching(
    similarity_matrix: list[list[float]],
    burnout_scores: list[float],
    burnout_weight: float = 0.3,
) -> list[tuple[int, int, float]]:
    """
    Solve the ILP to find optimal volunteer-task assignments.

    Maximizes: sum(similarity[i][j] * x[i][j]) - burnout_weight * sum(burnout[j] * x[i][j])
    Subject to:
    - Each task assigned to at most one volunteer
    - Each volunteer assigned to at most one task
    - x[i][j] is binary

    Returns list of (task_idx, volunteer_idx, adjusted_score)
    """
    num_tasks = len(similarity_matrix)
    if num_tasks == 0:
        return []
    num_volunteers = len(similarity_matrix[0])

    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        raise RuntimeError("SCIP solver not available")

    # Decision variables: x[i][j] = 1 if volunteer j assigned to task i
    x = {}
    for i in range(num_tasks):
        for j in range(num_volunteers):
            x[i, j] = solver.IntVar(0, 1, f"x_{i}_{j}")

    # Constraint: each task assigned to at most one volunteer
    for i in range(num_tasks):
        solver.Add(sum(x[i, j] for j in range(num_volunteers)) <= 1)

    # Constraint: each volunteer assigned to at most one task
    for j in range(num_volunteers):
        solver.Add(sum(x[i, j] for i in range(num_tasks)) <= 1)

    # Objective: maximize skill match while minimizing burnout
    objective = solver.Objective()
    for i in range(num_tasks):
        for j in range(num_volunteers):
            # Score = similarity - burnout_penalty
            score = similarity_matrix[i][j] - burnout_weight * (
                burnout_scores[j] / 100.0
            )
            objective.SetCoefficient(x[i, j], score)
    objective.SetMaximization()

    status = solver.Solve()
    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        return []

    results = []
    for i in range(num_tasks):
        for j in range(num_volunteers):
            if x[i, j].solution_value() > 0.5:
                adjusted = similarity_matrix[i][j] - burnout_weight * (
                    burnout_scores[j] / 100.0
                )
                results.append((i, j, adjusted))
    return results


# Placeholder skill vocabulary for vectorization
SKILL_VOCABULARY = [
    "healthcare", "education", "water", "sanitation", "agriculture",
    "construction", "teaching", "nursing", "engineering", "counseling",
    "logistics", "communication", "leadership", "technology", "finance",
]


def skills_to_vector(skills: list[str]) -> list[float]:
    """Convert skill strings to a binary vector using the vocabulary."""
    vector = [0.0] * len(SKILL_VOCABULARY)
    for skill in skills:
        skill_lower = skill.lower()
        for idx, vocab_skill in enumerate(SKILL_VOCABULARY):
            if vocab_skill in skill_lower or skill_lower in vocab_skill:
                vector[idx] = 1.0
    return vector


async def run_ivtm_matching(need_id: str) -> list[dict]:
    """
    Run the full i-VTM pipeline for a given community need.
    In production, this fetches data from Firestore/BigQuery.
    """
    # Placeholder: in production, fetch from database
    # For now, return structure showing the algorithm works
    sample_task_skills = ["healthcare", "water", "sanitation"]
    sample_volunteers = [
        {"id": "vol_1", "skills": ["healthcare", "nursing"], "burnout": 20},
        {"id": "vol_2", "skills": ["water", "engineering"], "burnout": 45},
        {"id": "vol_3", "skills": ["education", "teaching"], "burnout": 10},
    ]

    task_vec = skills_to_vector(sample_task_skills)
    vol_vectors = [skills_to_vector(v["skills"]) for v in sample_volunteers]
    burnout_scores = [v["burnout"] for v in sample_volunteers]

    sim_matrix = [[cosine_similarity(task_vec, vv) for vv in vol_vectors]]
    assignments = solve_ilp_matching(sim_matrix, burnout_scores)

    results = []
    for task_idx, vol_idx, adj_score in assignments:
        results.append({
            "need_id": need_id,
            "volunteer_id": sample_volunteers[vol_idx]["id"],
            "similarity_score": sim_matrix[task_idx][vol_idx],
            "burnout_adjusted_score": adj_score,
        })
    return results
