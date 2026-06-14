import json
import subprocess
import tempfile
import os
import logging
from celery import shared_task
from django.conf import settings
import anthropic

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

_BUG_ANALYSIS_TOOL = {
    "name": "report_code_analysis",
    "description": "Report structured findings from analyzing code for bugs, smells, and security issues.",
    "input_schema": {
        "type": "object",
        "properties": {
            "bugs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "line_start": {"type": "integer"},
                        "line_end": {"type": "integer"},
                        "description": {"type": "string"},
                        "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                        "fix_suggestion": {"type": "string"},
                    },
                    "required": ["line_start", "line_end", "description", "severity"],
                },
            },
            "code_smells": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "line_start": {"type": "integer"},
                        "line_end": {"type": "integer"},
                        "description": {"type": "string"},
                        "category": {"type": "string"},
                        "suggestion": {"type": "string"},
                    },
                    "required": ["line_start", "line_end", "description", "category"],
                },
            },
            "security_flags": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "line_start": {"type": "integer"},
                        "line_end": {"type": "integer"},
                        "vulnerability_type": {"type": "string"},
                        "owasp_category": {"type": "string"},
                        "description": {"type": "string"},
                        "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    },
                    "required": ["line_start", "line_end", "vulnerability_type", "description", "severity"],
                },
            },
        },
        "required": ["bugs", "code_smells", "security_flags"],
    },
}

_REVIEW_SCORING_TOOL = {
    "name": "score_review",
    "description": "Score the quality of a peer code review on multiple dimensions.",
    "input_schema": {
        "type": "object",
        "properties": {
            "overall_score": {"type": "number", "minimum": 0, "maximum": 100},
            "coverage_score": {"type": "number", "minimum": 0, "maximum": 100},
            "accuracy_score": {"type": "number", "minimum": 0, "maximum": 100},
            "constructiveness_score": {"type": "number", "minimum": 0, "maximum": 100},
            "bug_detection_score": {"type": "number", "minimum": 0, "maximum": 100},
            "missed_bugs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                        "line_start": {"type": "integer"},
                        "line_end": {"type": "integer"},
                    },
                    "required": ["description", "severity"],
                },
            },
            "feedback_summary": {"type": "string"},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "areas_for_improvement": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "overall_score",
            "coverage_score",
            "accuracy_score",
            "constructiveness_score",
            "bug_detection_score",
            "missed_bugs",
            "feedback_summary",
            "strengths",
            "areas_for_improvement",
        ],
    },
}

_HINT_TOOL = {
    "name": "generate_hint",
    "description": "Generate an adaptive hint for a student at the specified hint level.",
    "input_schema": {
        "type": "object",
        "properties": {
            "hint_text": {"type": "string"},
            "concepts_involved": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["hint_text"],
    },
}

_SKILL_GAP_TOOL = {
    "name": "analyze_skill_gap",
    "description": "Analyze skill gaps and updated scores after reviewing the submission and review cycle.",
    "input_schema": {
        "type": "object",
        "properties": {
            "readability_score": {"type": "number", "minimum": 0, "maximum": 100},
            "efficiency_score": {"type": "number", "minimum": 0, "maximum": 100},
            "security_score": {"type": "number", "minimum": 0, "maximum": 100},
            "readability_delta": {"type": "number"},
            "efficiency_delta": {"type": "number"},
            "security_delta": {"type": "number"},
            "analysis": {"type": "string"},
            "top_improvements": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "readability_score",
            "efficiency_score",
            "security_score",
            "readability_delta",
            "efficiency_delta",
            "security_delta",
            "analysis",
        ],
    },
}


def _extract_tool_result(response):
    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise ValueError("No tool_use block found in Claude response")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def analyze_submission_bugs(self, submission_id):
    from apps.assignments.models import Submission
    from apps.ai_analysis.models import AIAnalysis

    try:
        submission = Submission.objects.select_related("assignment").get(id=submission_id)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=[_BUG_ANALYSIS_TOOL],
            tool_choice={"type": "tool", "name": "report_code_analysis"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"You are a senior software engineer performing a thorough code review.\n\n"
                        f"Language: {submission.assignment.language}\n\n"
                        f"Problem statement:\n{submission.assignment.problem_statement}\n\n"
                        f"Code to analyze:\n```{submission.assignment.language}\n{submission.code}\n```\n\n"
                        f"Analyze for bugs (logic errors, edge cases, runtime errors), "
                        f"code smells (readability, maintainability, complexity), and "
                        f"security vulnerabilities (OWASP categories). "
                        f"Be thorough and specific with line numbers."
                    ),
                }
            ],
        )

        data = _extract_tool_result(response)
        ai_analysis, _ = AIAnalysis.objects.update_or_create(
            submission=submission,
            defaults={
                "bugs": data.get("bugs", []),
                "code_smells": data.get("code_smells", []),
                "security_flags": data.get("security_flags", []),
            },
        )

        submission.ai_analysis_result = {
            "bug_count": len(data.get("bugs", [])),
            "smell_count": len(data.get("code_smells", [])),
            "security_flag_count": len(data.get("security_flags", [])),
            "analysis_id": ai_analysis.id,
        }
        submission.save(update_fields=["ai_analysis_result"])

        return {"submission_id": submission_id, "analysis_id": ai_analysis.id}

    except Exception as exc:
        logger.exception("Bug analysis failed for submission %s", submission_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def score_peer_review(self, review_id):
    from apps.reviews.models import Review

    try:
        review = (
            Review.objects.select_related("submission__assignment")
            .prefetch_related("line_comments")
            .get(id=review_id)
        )
        submission = review.submission

        line_comments = [
            {"start_offset": lc.start_offset, "end_offset": lc.end_offset, "content": lc.content}
            for lc in review.line_comments.all()
        ]

        try:
            known_bugs = list(submission.ai_analysis.bugs)
        except Exception:
            known_bugs = []

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=[_REVIEW_SCORING_TOOL],
            tool_choice={"type": "tool", "name": "score_review"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"You are a senior software engineer evaluating a peer code review.\n\n"
                        f"Language: {submission.assignment.language}\n\n"
                        f"Code being reviewed:\n```{submission.assignment.language}\n{submission.code}\n```\n\n"
                        f"Reviewer's overall comment:\n{review.overall_comment}\n\n"
                        f"Inline comments (character offsets):\n{json.dumps(line_comments, indent=2)}\n\n"
                        f"Known bugs in this code (from automated analysis):\n{json.dumps(known_bugs, indent=2)}\n\n"
                        f"Score on: coverage (did they address all important aspects?), "
                        f"accuracy (were points technically correct?), "
                        f"constructiveness (were suggestions actionable?), "
                        f"bug_detection (did they find the actual bugs?).\n\n"
                        f"Do not reference any student identifiers in your analysis."
                    ),
                }
            ],
        )

        data = _extract_tool_result(response)

        review.ai_quality_score = data["overall_score"]
        review.coverage_score = data["coverage_score"]
        review.accuracy_score = data["accuracy_score"]
        review.constructiveness_score = data["constructiveness_score"]
        review.bug_detection_score = data["bug_detection_score"]
        review.missed_bugs = data.get("missed_bugs", [])
        review.strengths = data.get("strengths", [])
        review.areas_for_improvement = data.get("areas_for_improvement", [])
        review.feedback_summary = data.get("feedback_summary", "")
        review.save()

        update_skill_scores.delay(review.reviewer_id, review_id)
        return data

    except Exception as exc:
        logger.exception("Review scoring failed for review %s", review_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_hint(self, submission_id, student_id, level):
    from apps.assignments.models import Submission
    from apps.ai_analysis.models import HintRequest

    LEVEL_INSTRUCTIONS = {
        1: "Give a very gentle nudge. Do NOT reveal any solution or approach. Just point to the concept the student should think about.",
        2: "Explain the relevant concept clearly, but do NOT give any code or direct solution approach.",
        3: "Provide a near-solution hint: describe the approach step by step, but stop short of writing the actual code.",
    }

    try:
        submission = Submission.objects.select_related("assignment").get(id=submission_id)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=[_HINT_TOOL],
            tool_choice={"type": "tool", "name": "generate_hint"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"A student is working on a {submission.assignment.language} programming problem.\n\n"
                        f"Problem:\n{submission.assignment.problem_statement}\n\n"
                        f"Their current code:\n```{submission.assignment.language}\n{submission.code}\n```\n\n"
                        f"Hint level {level}: {LEVEL_INSTRUCTIONS[level]}"
                    ),
                }
            ],
        )

        data = _extract_tool_result(response)

        hint, _ = HintRequest.objects.update_or_create(
            student_id=student_id,
            submission_id=submission_id,
            level=level,
            defaults={"hint_text": data["hint_text"]},
        )
        return {"hint_id": hint.id, "hint_text": data["hint_text"]}

    except Exception as exc:
        logger.exception("Hint generation failed for submission %s level %s", submission_id, level)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def update_skill_scores(self, student_id, review_id):
    from apps.reviews.models import Review
    from apps.ai_analysis.models import SkillSnapshot
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        student = User.objects.get(id=student_id)
        review = Review.objects.select_related("submission__assignment").get(id=review_id)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=[_SKILL_GAP_TOOL],
            tool_choice={"type": "tool", "name": "analyze_skill_gap"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Analyze a student's coding skills based on their review performance.\n\n"
                        f"Current skill scores (0-100):\n"
                        f"  Readability: {student.readability_score}\n"
                        f"  Efficiency: {student.efficiency_score}\n"
                        f"  Security: {student.security_score}\n\n"
                        f"Review quality scores:\n"
                        f"  Coverage: {review.coverage_score}\n"
                        f"  Accuracy: {review.accuracy_score}\n"
                        f"  Constructiveness: {review.constructiveness_score}\n"
                        f"  Bug detection: {review.bug_detection_score}\n\n"
                        f"Missed bugs: {json.dumps(review.missed_bugs)}\n\n"
                        f"Update the three skill dimension scores (readability, efficiency, security) "
                        f"based on this review cycle. Small increments only — max ±5 per cycle."
                    ),
                }
            ],
        )

        data = _extract_tool_result(response)

        student.readability_score = min(100, max(0, data["readability_score"]))
        student.efficiency_score = min(100, max(0, data["efficiency_score"]))
        student.security_score = min(100, max(0, data["security_score"]))
        student.save(update_fields=["readability_score", "efficiency_score", "security_score"])

        SkillSnapshot.objects.create(
            student=student,
            readability=student.readability_score,
            efficiency=student.efficiency_score,
            security=student.security_score,
            notes=f"After review #{review_id}",
        )

        return {
            "student_id": student_id,
            "readability": student.readability_score,
            "efficiency": student.efficiency_score,
            "security": student.security_score,
        }

    except Exception as exc:
        logger.exception("Skill score update failed for student %s", student_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def execute_code_in_sandbox(self, submission_id):
    from apps.assignments.models import Submission

    LANGUAGE_RUNNERS = {
        "python": ("python:3.12-slim", "python /code/main.py"),
        "javascript": ("node:20-slim", "node /code/main.js"),
        "java": ("openjdk:21-slim", "sh -c 'cd /code && javac Main.java && java Main'"),
        "cpp": ("gcc:13", "sh -c 'cd /code && g++ -o main main.cpp && ./main'"),
        "c": ("gcc:13", "sh -c 'cd /code && gcc -o main main.c && ./main'"),
        "typescript": ("node:20-slim", "sh -c 'npm install -g ts-node && ts-node /code/main.ts'"),
    }

    FILE_NAMES = {
        "python": "main.py",
        "javascript": "main.js",
        "java": "Main.java",
        "cpp": "main.cpp",
        "c": "main.c",
        "typescript": "main.ts",
    }

    try:
        submission = Submission.objects.select_related("assignment").get(id=submission_id)
        submission.status = Submission.RUNNING
        submission.save(update_fields=["status"])

        language = submission.assignment.language
        image, cmd = LANGUAGE_RUNNERS.get(language, ("python:3.12-slim", "python /code/main.py"))
        filename = FILE_NAMES.get(language, "main.py")

        with tempfile.TemporaryDirectory() as tmpdir:
            code_path = os.path.join(tmpdir, filename)
            with open(code_path, "w") as f:
                f.write(submission.code)

            if submission.assignment.test_suite:
                test_path = os.path.join(tmpdir, "test_suite.txt")
                with open(test_path, "w") as f:
                    f.write(submission.assignment.test_suite)

            docker_cmd = [
                "docker", "run",
                "--rm",
                "--network=none",
                f"--memory={settings.CODE_EXEC_MEMORY_LIMIT}",
                f"--cpus={settings.CODE_EXEC_CPU_LIMIT}",
                "--read-only",
                "--tmpfs=/tmp:noexec,size=10m",
                f"--volume={tmpdir}:/code:ro",
                image,
                "sh", "-c", cmd,
            ]

            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=settings.CODE_EXEC_TIMEOUT,
            )

        execution_result = {
            "stdout": result.stdout[:10000],
            "stderr": result.stderr[:2000],
            "exit_code": result.returncode,
            "timed_out": False,
        }
        submission.status = Submission.PASSED if result.returncode == 0 else Submission.FAILED

    except subprocess.TimeoutExpired:
        execution_result = {
            "stdout": "",
            "stderr": "Execution timed out.",
            "exit_code": -1,
            "timed_out": True,
        }
        submission.status = Submission.ERROR
    except Exception as exc:
        logger.exception("Code execution failed for submission %s", submission_id)
        execution_result = {"stdout": "", "stderr": str(exc), "exit_code": -1, "timed_out": False}
        submission.status = Submission.ERROR
        submission.execution_result = execution_result
        submission.save(update_fields=["status", "execution_result"])
        raise self.retry(exc=exc)

    submission.execution_result = execution_result
    submission.save(update_fields=["status", "execution_result"])

    analyze_submission_bugs.delay(submission_id)
    return execution_result
