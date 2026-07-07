from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "mysql+pymysql://root@localhost:3306/gestao_importacoes"
    SECRET_KEY: str = "dev-secret-key-mudar-em-producao"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    JWT_ALGORITHM: str = "HS256"

    # Cálculo do frete aéreo.
    # A fonte de verdade é a tabela `configuracao_frete` (editável no frontend, só admin).
    # Estes valores servem apenas como semente inicial e são espelhados em runtime.
    # valor a pagar = peso cobrável × TARIFA_POR_KG
    # peso volumétrico = (C × L × A em cm) / DIVISOR_VOLUMETRICO
    TARIFA_POR_KG: float = 1800.0
    DIVISOR_VOLUMETRICO: int = 6000
    # ISPC — empresa em Imposto Simplificado p/ Pequenos Contribuintes (não cobra IVA).
    # Método: PROGRESSIVA (3/4/5% por escalão), FIXA (percentagem única) ou QUOTA (valor anual).
    ISPC_METODO: str = "PROGRESSIVA"
    ISPC_PERCENTAGEM: float = 3.0
    ISPC_QUOTA_ANUAL: float = 75000.0
    ISPC_PRIMEIRO_ANO: bool = False

    # Multa por atraso no pagamento do frete (após disponibilidade em Maputo).
    # Aplica-se MULTA_VALOR_DIA por cada dia além de MULTA_DIAS_TOLERANCIA.
    MULTA_VALOR_DIA: float = 200.0
    MULTA_DIAS_TOLERANCIA: int = 3

    TRACKING_API_PROVIDER: str = "17track"
    TRACKING_API_KEY: str = ""
    TRACKING_API_BASE_URL: str = "https://api.17track.net/track/v2.2"
    TRACKING_SYNC_INTERVAL_MINUTES: int = 30

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@conneximportacoes.co.mz"


settings = Settings()
