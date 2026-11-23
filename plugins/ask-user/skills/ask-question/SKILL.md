---
name: ask-question
description: Ask a selectable question in Codex when the user wants to choose among options or when their preference determines the next step. Supports the Pi-style ask-user flow and a custom answer.
---

Ask one concrete question in English unless the user asks for another language. Offer short, distinct choices and leave the selection to the user. Use the Ask User plugin's ask_question tool and wait for its result before acting on that decision. Treat a custom response as the user's answer. A cancellation, dismissal, empty response, or timeout leaves the decision open.

If this client cannot display an MCP form, use its native structured question card when available. With an asynchronous card, wait for an explicit reply before doing dependent work. If the user cancels, respect that cancellation without immediately asking again.
