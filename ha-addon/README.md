# Bonap — Home Assistant Addon Repository

This repository contains the [Home Assistant](https://www.home-assistant.io/) addon for [Bonap](https://github.com/AymericLeFeyer/bonap), an ergonomic front-end for [Mealie](https://mealie.io).

## Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the **three-dot menu** (top right) and select **Repositories**
3. Paste the following URL and click **Add**:
   ```
   https://github.com/AymericLeFeyer/bonap
   ```
4. Refresh the page — **Bonap** will appear in the store
5. Click **Bonap → Install**

## Configuration

After installation, go to the addon **Configuration** tab and fill in:

- **Mealie URL** — URL of your Mealie instance (e.g. `http://192.168.1.100:9000`)
- **Mealie API Token** — Bearer token from Mealie → Profile → API Tokens

Click **Save**, then **Start**.

## Addons in this repository

| Addon | Description |
|---|---|
| [Bonap](bonap/) | Ergonomic front-end for Mealie |
