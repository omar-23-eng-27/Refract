from rest_framework import serializers
from .models import Assignment, Submission


class AssignmentSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = (
            "id",
            "title",
            "language",
            "problem_statement",
            "starter_code",
            "test_suite",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "due_date",
            "review_deadline",
            "is_active",
            "submission_count",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def get_submission_count(self, obj):
        return obj.submissions.count()


class AssignmentListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    user_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = (
            "id",
            "title",
            "language",
            "created_by_username",
            "due_date",
            "is_active",
            "user_submission",
        )

    def get_user_submission(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            sub = obj.submissions.filter(student=request.user).order_by("-version").first()
            if sub:
                return {"id": sub.id, "version": sub.version, "status": sub.status}
        return None


class SubmissionSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = (
            "id",
            "assignment",
            "assignment_title",
            "student",
            "student_username",
            "code",
            "version",
            "status",
            "execution_result",
            "ai_analysis_result",
            "submitted_at",
            "updated_at",
            "review_count",
        )
        read_only_fields = (
            "id",
            "student",
            "version",
            "status",
            "execution_result",
            "ai_analysis_result",
            "submitted_at",
            "updated_at",
        )

    def get_review_count(self, obj):
        return obj.reviews.count()

    def create(self, validated_data):
        student = self.context["request"].user
        assignment = validated_data["assignment"]
        last = Submission.objects.filter(assignment=assignment, student=student).order_by("-version").first()
        version = (last.version + 1) if last else 1
        return Submission.objects.create(student=student, version=version, **validated_data)
