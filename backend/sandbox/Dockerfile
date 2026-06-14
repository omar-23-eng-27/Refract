FROM python:3.12-slim

RUN useradd -m -u 1000 sandbox
USER sandbox
WORKDIR /code

CMD ["python", "/code/main.py"]
