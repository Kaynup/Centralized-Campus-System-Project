import pytest
import uuid

class TestAdminIntegration:
    """Integration tests for admin endpoints"""
    
    def test_add_equipment_by_admin(self, client, auth_headers, setup_database):
        """Test admin adding equipment"""
        response = client.post("/admin/equipments", json={
            "name": "Projector",
            "description": "High-quality projector",
            "category": "Other",
            "deposit_amount": 100.00,
            "quantity": 3
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Equipment added successfully"
    
    def test_get_equipments(self, client, auth_headers, setup_database, create_test_equipment):
        """Test getting list of all equipment"""
        response = client.get("/admin/equipments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
    
    def test_get_dashboard_stats(self, client, auth_headers, setup_database):
        """Test getting dashboard statistics"""
        response = client.get("/admin/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "total_equipments" in data
        assert "active_rentals" not in data # It's 'borrowed'
        assert "borrowed" in data
        assert "late" in data
    
    def test_get_all_rentals_admin(self, client, auth_headers, setup_database):
        """Test admin getting all rentals"""
        response = client.get("/admin/rentals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_late_rentals(self, client, auth_headers, setup_database):
        """Test getting late rentals"""
        response = client.get("/admin/rentals/late", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_equipment_by_admin(self, client, auth_headers, setup_database, create_test_equipment):
        """Test admin updating equipment"""
        equipment_id = create_test_equipment["id"]
        
        # Update equipment
        update_response = client.put(f"/admin/equipments/{equipment_id}", json={
            "name": "Updated Name",
            "description": "Updated desc",
            "category": "Other",
            "deposit_amount": 75.00,
            "quantity": 10
        }, headers=auth_headers)
        
        assert update_response.status_code == 200
    
    def test_get_all_transactions_admin(self, client, auth_headers, setup_database):
        """Test admin getting all transactions"""
        response = client.get("/admin/transactions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
