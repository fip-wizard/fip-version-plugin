import fastapi
import fastapi.middleware.cors

from . import logic, schemas


def create_app() -> fastapi.FastAPI:
    app = fastapi.FastAPI(
        title='Plugin Service',
        version='1.0.0',
    )

    app.add_middleware(
        middleware_class=fastapi.middleware.cors.CORSMiddleware,  # type: ignore
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    @app.post('/api/prepare-action', response_model=schemas.PrepareResponse)
    async def prepare_action(
        req: schemas.PrepareRequest,
    ) -> schemas.PrepareResponse:
        return await logic.prepare_action(req.api_url, req)

    @app.post('/api/save-version', response_model=schemas.VersionSaveResponse)
    async def save_version(
        req: schemas.VersionRequest,
    ) -> schemas.VersionSaveResponse:
        return await logic.save_version(req.api_url, req)

    @app.post(
        '/api/submit-version', response_model=schemas.VersionSubmitResponse
    )
    async def submit_version(
        req: schemas.VersionRequest,
    ) -> schemas.VersionSubmitResponse:
        return await logic.submit_version(req.api_url, req)

    return app
