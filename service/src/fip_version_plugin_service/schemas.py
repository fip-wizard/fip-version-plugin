import pydantic


class PrepareRequest(pydantic.BaseModel):
    project_uuid: str = pydantic.Field(..., alias='projectUuid')
    user_token: str = pydantic.Field(..., alias='userToken')
    api_url: str = pydantic.Field(..., alias='apiUrl')


class SubmittedVersion(pydantic.BaseModel):
    uri: str
    version: str | None = None
    submitted_at: str | None = pydantic.Field(default=None, alias='submittedAt')


class PrepareResponse(pydantic.BaseModel):
    ok: bool
    message: str | None = None
    questionnaire_version: str | None = pydantic.Field(default=None, alias='questionnaireVersion')
    submitted_versions: list = pydantic.Field(default_factory=list, alias='submittedVersions')
    debug: dict | None = None


class VersionRequest(pydantic.BaseModel):
    project_uuid: str = pydantic.Field(..., alias='projectUuid')
    user_token: str = pydantic.Field(..., alias='userToken')
    api_url: str = pydantic.Field(..., alias='apiUrl')
    version: str
    description: str = pydantic.Field(default='')
    submission_service_id: str | None = pydantic.Field(default=None, alias='submissionServiceId')


class VersionSaveResponse(pydantic.BaseModel):
    ok: bool
    message: str | None = None


class VersionSubmitResponse(pydantic.BaseModel):
    ok: bool
    message: str | None = None
    document_done: bool = pydantic.Field(default=False, alias='documentDone')
    document_uuid: str | None = pydantic.Field(default=None, alias='documentUuid')
    submission_done: bool = pydantic.Field(default=False, alias='submissionDone')
    submission_uuid: str | None = pydantic.Field(default=None, alias='submissionUuid')
    submission_location: str | None = pydantic.Field(default=None, alias='submissionLocation')
