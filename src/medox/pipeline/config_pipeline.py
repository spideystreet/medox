from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class PipelineSettings(BaseSettings):
    # PostgreSQL
    postgres_host: str
    postgres_port: int
    postgres_user: str
    postgres_password: str
    postgres_db: str

    # ChromaDB
    chroma_host: str
    chroma_port: int

    # OpenRouter (optional — only needed for Dagster pipeline, not for BYOK agent)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "mistralai/ministral-8b-2512"

    # Embeddings (local HuggingFace model via sentence-transformers)
    embedding_model: str = "intfloat/multilingual-e5-base"  # ${EMBEDDING_MODEL}

    # Local paths
    bronze_dir: Path = Path("data/bronze")

    # Official data source URLs
    bdpm_base_url: str = "https://base-donnees-publique.medicaments.gouv.fr"
    ansm_thesaurus_page_url: str = (
        "https://ansm.sante.fr/documents/reference/thesaurus-des-interactions-medicamenteuses-1"
    )
    open_medic_base_url: str = "https://open-data-assurance-maladie.ameli.fr/medicaments"
    open_medic_year: int = 2024

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
