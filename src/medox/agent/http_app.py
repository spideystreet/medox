"""Custom HTTP routes for the LangGraph server."""

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route


async def health(request: Request) -> JSONResponse:
    """Health check endpoint for Docker healthchecks and monitoring."""
    return JSONResponse({"status": "ok"})


app = Starlette(routes=[Route("/health", endpoint=health, methods=["GET"])])
