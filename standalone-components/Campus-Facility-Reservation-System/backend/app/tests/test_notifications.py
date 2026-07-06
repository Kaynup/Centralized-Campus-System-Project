from fastapi.testclient import TestClient

def test_fetch_notifications_empty(client: TestClient, student_token: str):
    response = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_mark_notification_read(client: TestClient, student_token: str, student_user, db_session):
    # Create a dummy notification directly via crud
    from app.db.models import Notification
    notification = Notification(
        user_id=student_user.id,
        type="test_type",
        title="Test Notification",
        message="This is a test notification."
    )
    db_session.add(notification)
    db_session.flush()
    notification_id = notification.id

    # Fetch to ensure it is there and unread
    response = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    data = response.json()
    notif = next((n for n in data if n["id"] == notification_id), None)
    assert notif is not None
    assert notif["read"] is False

    # Mark as read
    read_resp = client.post(f"/api/v1/notifications/{notification_id}/read", headers={"Authorization": f"Bearer {student_token}"})
    assert read_resp.status_code == 200
    assert read_resp.json()["read"] is True

def test_mark_all_read_and_clear(client: TestClient, student_token: str, student_user, db_session):
    from app.db.crud.notification import create_notification
    n1 = create_notification(db_session, user_id=student_user.id, type="test", title="T1", message="M1")
    n2 = create_notification(db_session, user_id=student_user.id, type="test", title="T2", message="M2")
    n1_id = n1.id
    n2_id = n2.id
    db_session.commit()

    # Mark all read
    mark_resp = client.post("/api/v1/notifications/read-all", headers={"Authorization": f"Bearer {student_token}"})
    assert mark_resp.status_code == 200

    # Verify all are read
    fetch_resp = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {student_token}"})
    for n in fetch_resp.json():
        if n["id"] in (n1_id, n2_id):
            assert n["read"] is True

    # Clear read
    clear_resp = client.delete("/api/v1/notifications/clear-read", headers={"Authorization": f"Bearer {student_token}"})
    assert clear_resp.status_code == 200

    # Verify they are gone
    final_resp = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {student_token}"})
    data = final_resp.json()
    assert not any(n["id"] == n1_id for n in data)
    assert not any(n["id"] == n2_id for n in data)
