"""Custom HTTP routes for the LangGraph server."""

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route, Router


async def health(request: Request) -> JSONResponse:
    """Health check endpoint for Docker healthchecks and monitoring."""
    return JSONResponse({"status": "ok"})


app = Router(routes=[Route("/health", endpoint=health, methods=["GET"])])
