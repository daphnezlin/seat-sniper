web: uvicorn api:app --host 0.0.0.0 --port $PORT
worker: python -m arq workers.arq_worker.WorkerSettings
