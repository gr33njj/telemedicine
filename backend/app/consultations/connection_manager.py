from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Dict, List, Optional

from fastapi import WebSocket


@dataclass
class ConsultationConnection:
    consultation_id: int
    websocket: WebSocket
    user_id: int
    user_role: str
    participant_type: str  # doctor | patient | admin
    display_name: str


class ConsultationWebSocketManager:
    """Управляет подключениями в комнатах консультаций."""

    def __init__(self) -> None:
        self.rooms: Dict[int, List[ConsultationConnection]] = {}
        self.lock = asyncio.Lock()

    async def register(self, connection: ConsultationConnection) -> List[ConsultationConnection]:
        async with self.lock:
            room = self.rooms.setdefault(connection.consultation_id, [])
            room.append(connection)
            return room.copy()

    async def unregister(self, connection: ConsultationConnection) -> None:
        async with self.lock:
            room = self.rooms.get(connection.consultation_id, [])
            if connection in room:
                room.remove(connection)
            if not room:
                self.rooms.pop(connection.consultation_id, None)

    def get_other_connections(
        self,
        consultation_id: int,
        exclude_user_id: Optional[int] = None,
    ) -> List[ConsultationConnection]:
        room = self.rooms.get(consultation_id, [])
        if exclude_user_id is None:
            return room.copy()
        return [conn for conn in room if conn.user_id != exclude_user_id]

    async def send_personal_message(self, connection: ConsultationConnection, message: dict) -> None:
        await connection.websocket.send_json(message)

    async def broadcast(
        self,
        consultation_id: int,
        message: dict,
        exclude_user_id: Optional[int] = None,
    ) -> None:
        recipients = self.get_other_connections(consultation_id, exclude_user_id)
        for conn in recipients:
            try:
                await conn.websocket.send_json(message)
            except Exception:
                # Соединение могло разорваться без события disconnect
                await self.unregister(conn)


manager = ConsultationWebSocketManager()

