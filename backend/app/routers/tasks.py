"""
Tasks Router — /api/tasks/*
============================
CRUD operations for process planning tasks.
"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..sql_models import TaskDB
from ..models import Task, User

router = APIRouter()

DEFAULT_TASKS = [
    {"id": "A", "name": "PCB Preparation & Kitting", "time": 12.0, "predecessors": [], "zoning": "None", "custom_attributes": {}},
    {"id": "B", "name": "Motherboard SMT & Assembly", "time": 18.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
    {"id": "C", "name": "Display Module Preparation", "time": 15.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
    {"id": "D", "name": "Power Supply Unit Prep", "time": 10.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
    {"id": "E", "name": "Core Integration", "time": 20.0, "predecessors": ["B", "C", "D"], "zoning": "None", "custom_attributes": {}},
    {"id": "F", "name": "Firmware Flashing & Calibration", "time": 25.0, "predecessors": ["E"], "zoning": "None", "custom_attributes": {}},
    {"id": "G", "name": "Chassis Housing Assembly", "time": 14.0, "predecessors": ["F"], "zoning": "None", "custom_attributes": {}},
    {"id": "H", "name": "Final QA, Testing & Packaging", "time": 16.0, "predecessors": ["G"], "zoning": "None", "custom_attributes": {}},
]


def _query_tasks(db: Session, user_id: str, tenant_id: str | None):
    if tenant_id:
        return db.query(TaskDB).filter(TaskDB.tenant_id == tenant_id).all()
    return db.query(TaskDB).filter(TaskDB.user_id == user_id).all()


@router.get("/api/tasks", response_model=List[Task])
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    task_rows = _query_tasks(db, user_id, tenant_id)
    if not task_rows:
        for t in DEFAULT_TASKS:
            db.add(TaskDB(
                task_id=t["id"], user_id=user_id, tenant_id=tenant_id,
                name=t["name"], time=t["time"],
                predecessors_json=json.dumps(t["predecessors"]),
                zoning=t.get("zoning", "None"),
                custom_attributes_json=json.dumps(t.get("custom_attributes", {})),
            ))
        db.commit()
        task_rows = _query_tasks(db, user_id, tenant_id)
    return [row.to_dict() for row in task_rows]


@router.put("/api/tasks", response_model=List[Task])
def replace_tasks(tasks: List[Task], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    if tenant_id:
        db.query(TaskDB).filter(TaskDB.tenant_id == tenant_id).delete()
    else:
        db.query(TaskDB).filter(TaskDB.user_id == user_id).delete()
    for task in tasks:
        db.add(TaskDB(
            task_id=task.id, user_id=user_id, tenant_id=tenant_id,
            name=task.name, time=task.time,
            predecessors_json=json.dumps(task.predecessors),
            zoning=task.zoning or "None",
            custom_attributes_json=json.dumps(task.custom_attributes or {}),
        ))
    db.commit()
    return tasks


@router.post("/api/tasks", response_model=Task)
def create_task(task: Task, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(TaskDB(
        task_id=task.id, user_id=current_user.id, tenant_id=current_user.tenant_id,
        name=task.name, time=task.time,
        predecessors_json=json.dumps(task.predecessors),
        zoning=task.zoning or "None",
        custom_attributes_json=json.dumps(task.custom_attributes or {}),
    ))
    db.commit()
    return task


@router.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task: Task, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    existing = None
    if tenant_id:
        existing = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.tenant_id == tenant_id).first()
    if not existing:
        existing = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.user_id == user_id).first()
    if existing:
        existing.task_id = task.id
        existing.name = task.name
        existing.time = task.time
        existing.predecessors_json = json.dumps(task.predecessors)
        existing.zoning = task.zoning or "None"
        existing.custom_attributes_json = json.dumps(task.custom_attributes or {})
        if tenant_id and not existing.tenant_id:
            existing.tenant_id = tenant_id
    else:
        db.add(TaskDB(
            task_id=task.id, user_id=user_id, tenant_id=tenant_id,
            name=task.name, time=task.time,
            predecessors_json=json.dumps(task.predecessors),
            zoning=task.zoning or "None",
            custom_attributes_json=json.dumps(task.custom_attributes or {}),
        ))
    db.commit()
    return task


@router.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = current_user.tenant_id
    if tenant_id:
        count = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.tenant_id == tenant_id).delete()
    else:
        count = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.user_id == current_user.id).delete()
    db.commit()
    if count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return Response(status_code=204)
