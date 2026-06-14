from .base import *
from decouple import config

DEBUG = False

# Render sets ALLOWED_HOSTS automatically; we also allow any *.onrender.com subdomain
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default=".onrender.com,localhost,127.0.0.1",
).split(",")

CORS_ALLOWED_ORIGINS = [o.strip() for o in config("CORS_ALLOWED_ORIGINS", default="").split(",") if o.strip()]

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
# Render terminates SSL at the load balancer; trust the X-Forwarded-Proto header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

# WhiteNoise compressed static files
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}
