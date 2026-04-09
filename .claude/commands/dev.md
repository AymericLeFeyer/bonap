# Lancer le serveur de développement

Lance le serveur de dev de l'app principale Bonap (React + Vite, port 5173).

```bash
npm run dev
```

Proxy actif :
- `/api` → `VITE_MEALIE_URL` (Mealie)
- `/anthropic`, `/openai`, `/google-ai` → APIs LLM respectives (contournement CORS)
