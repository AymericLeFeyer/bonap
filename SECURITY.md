# Security Policy

## Versions supportées

| Version | Support |
|---------|---------|
| latest  | ✅ |
| < latest | ❌ |

## Signaler une vulnérabilité

**Ne pas ouvrir une issue publique** pour un problème de sécurité.

Envoyez un e-mail à l'adresse indiquée dans le profil GitHub ou ouvrez un [Security Advisory privé](https://github.com/AymericLeFeyer/bonap/security/advisories/new) sur GitHub.

Incluez :
- Une description de la vulnérabilité
- Les étapes pour la reproduire
- L'impact potentiel

Vous recevrez une réponse sous 48h. Une fois le correctif déployé, la vulnérabilité sera divulguée publiquement via le Security Advisory.

## Notes

Bonap est un front-end qui se connecte à votre instance Mealie via un token API. Il ne stocke aucune donnée sensible côté serveur — le token est dans votre `.env` et les préférences UI en localStorage. Assurez-vous que votre `.env` n'est jamais commité (il est dans `.gitignore`).
