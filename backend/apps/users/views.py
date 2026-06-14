from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, UserUpdateSerializer
from apps.ai_analysis.models import SkillSnapshot
from apps.ai_analysis.serializers import SkillSnapshotSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        from apps.assignments.models import Assignment, Submission
        from apps.reviews.models import Review

        assignments = Assignment.objects.filter(is_active=True).order_by("-created_at")[:10]
        submissions = Submission.objects.filter(student=user).select_related("assignment").order_by("-submitted_at")[:5]
        reviews_given = Review.objects.filter(reviewer=user).select_related("submission__assignment").order_by("-created_at")[:5]
        snapshots = SkillSnapshot.objects.filter(student=user).order_by("created_at")

        from apps.assignments.serializers import AssignmentListSerializer, SubmissionSerializer
        from apps.reviews.serializers import ReviewListSerializer

        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "assignments": AssignmentListSerializer(assignments, many=True, context={"request": request}).data,
                "recent_submissions": SubmissionSerializer(submissions, many=True, context={"request": request}).data,
                "recent_reviews": ReviewListSerializer(reviews_given, many=True, context={"request": request}).data,
                "skill_snapshots": SkillSnapshotSerializer(snapshots, many=True).data,
            }
        )
