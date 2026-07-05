import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BalanceCard from '../../components/ui/BalanceCard/BalanceCard';
import ItemCard from '../../components/ui/ItemCard/ItemCard';
import SecurityCard from '../../components/ui/SecurityCard/SecurityCard';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { useAuth } from "../../../../shared/hooks/useAuth";
import { useWallet } from "../../../../shared/hooks/useWallet";
import { FiBell, FiPackage, FiHeart, FiMessageCircle, FiShield, FiChevronRight, FiClock, FiAlertCircle, FiPlus, FiCheckCircle, FiTrendingUp, FiShoppingBag } from 'react-icons/fi';

import { confirmDelivery } from '../../services/purchaseService';
import { marketplaceClient as API } from '../../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../../shared/api/endpoints';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
const {
  balance,
  heldBalance,
  refreshBalance, 
} = useWallet();

  // States
  const [dashboardData, setDashboardData] = useState(null);
  const [savedItems, setSavedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

const response = await API.get(ENDPOINTS.MARKETPLACE.DASHBOARD);

    setDashboardData(response.data.data);
  } catch (err) {
    setError(
      err?.response?.data?.error?.message ??
      "Failed to load dashboard"
    );
  } finally {
    setLoading(false);
  }
}, []);

  // const fetchDashboard = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     const response = await API.get("/dashboard");
  //     setDashboardData(response.data.data);
  //   } catch (err) {
  //     setError(
  //       err?.response?.data?.error?.message || "Failed to load dashboard"
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleConfirmDelivery = async (purchaseId) => {
    try {
      setConfirming(true);
      await confirmDelivery(purchaseId);
      // Refresh dashboard to reflect new balance and cleared hold
      await Promise.all([
  fetchDashboard(),
  refreshBalance?.(),
]);
    } catch (err) {
      console.error("Confirm delivery failed:", err);
    } finally {
      setConfirming(false);
    }
  };

  const handleSaveItem = (itemId) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  if (error) {
    return (
      <div className="dashboard page">
        <div className="dashboard__body">
          <EmptyState
            icon={FiShield}
            title="Could not load dashboard"
            description={error}
            action={fetchDashboard}
            actionLabel="Try Again"
          />
        </div>
      </div>
    );
  }

const {
  stats,
  active_purchase,
  recent_listings,
} = dashboardData || {};
  const activePurchase = active_purchase
    ? {
        ...active_purchase,
        imageUrl: active_purchase.image_url,
        sellerName: active_purchase.seller_name,
        sellerRole: active_purchase.seller_role,
        paymentStatus: active_purchase.payment_status,
        id: active_purchase.purchase_id,
      }
    : null;

  return (
    <div className="dashboard page anim-fade-in">
      {/* ── Header Banner ── */}
      <div className="dashboard__banner">
        <div className="dashboard__banner-inner">
          <div className="dashboard__greeting">
            <div className="dashboard__avatar avatar avatar-md">
  {user?.name?.charAt(0) ?? "?"}
</div>
            <div>
              <p className="dashboard__greeting-label">Hello,</p>
              <p className="dashboard__greeting-name">{user?.name ?? "—"}</p>
            </div>
          </div>
          
        </div>
        <BalanceCard
  availableBalance={balance}
  heldBalance={heldBalance}
  onTopUp={() => navigate("/wallet")}
  onHistory={() => navigate("/wallet")}
/>
      </div>

      <div className="dashboard__body">
        {/* ── Quick Stats ── */}
        <div className="dashboard__stats">
          {[
            { icon: FiPackage, label: 'My Listings', value: stats?.active_listings ?? 0, to: '/my-listings', color: 'var(--color-blue)' },
            { icon: FiHeart, label: 'Saved Items', value: stats?.saved_items ?? 0, to: '/browse', color: '#8b5cf6' },
            { icon: FiMessageCircle, label: 'Messages', value: stats?.unread_messages ?? 0, to: '/messages', color: 'var(--color-green)' },
          ].map((s) => (
            <button
              key={s.label}
              className="dashboard__stat-card card"
              onClick={() => navigate(`/marketplace${s.to}`)}
              type="button"
            >
              <s.icon size={20} color={s.color} />
              <span className="dashboard__stat-value">{s.value}</span>
              <span className="dashboard__stat-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Security Notice ── */}
        <SecurityCard
          title="Secure Campus Marketplace"
          message="Buyer payments are protected in a secure vault until you confirm item delivery."
          variant="info"
        />

        {/* ── Active Purchase ── */}
        <div className="dashboard__section">
          <div className="section-header">
            <span className="section-title">Active Purchase</span>
            <button className="section-link" onClick={() => navigate('/marketplace/purchases')}>
              View all <FiChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <LoadingState type="list" count={1} />
          ) : activePurchase ? (
            <div className="dashboard__purchase-card card">
              <div className="dashboard__purchase-body">
                <div className="dashboard__purchase-image-wrap">
                  {activePurchase.imageUrl
                    ? <img src={activePurchase.imageUrl} alt={activePurchase.title} className="dashboard__purchase-image" />
                    : <div className="dashboard__purchase-image-placeholder" />
                  }
                </div>
                <div className="dashboard__purchase-info">
                  <p className="dashboard__purchase-title">{activePurchase.title}</p>
                  <p className="dashboard__purchase-seller">
                    {activePurchase.sellerName} · {activePurchase.sellerRole}
                  </p>
                  <div className="dashboard__purchase-meta">
                    <StatusBadge status={activePurchase.paymentStatus} />
                    <span className="dashboard__purchase-price">
                      ₹{Number(activePurchase.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {activePurchase.paymentStatus === 'holding' && (
                <div className="dashboard__purchase-action">
                  <FiClock size={14} />
                  <span className="dashboard__purchase-action-text">
                    Have you received this item?
                  </span>
                  <button
                    className="btn btn-sm btn-inline"
                    style={{ background: 'var(--color-green)', color: '#fff', border: 'none' }}
                    onClick={() => handleConfirmDelivery(activePurchase.id)}
                    type="button"
                  >
                    {confirming ? "Confirming..." : "Confirm"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={FiPackage}
              title="No active purchases"
              description="Items you purchase will appear here."
            />
          )}
        </div>

        {/* ── Recent Listings ── */}
        <div className="dashboard__section">
          <div className="section-header">
            <span className="section-title">Recent Listings</span>
            <button className="section-link" onClick={() => navigate('/marketplace/browse')}>
              Browse <FiChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <LoadingState type="grid" count={4} />
          ) : !recent_listings || recent_listings.length === 0 ? (
            <EmptyState
              icon={FiShoppingBag}
              title="No listings yet"
              description="Be the first to list something on the campus marketplace."
              action={() => navigate('/marketplace/list-item')}
              actionLabel="List an Item"
            />
          ) : (
            <div className="dashboard__items-grid">
              {recent_listings.slice(0, 4).map((item) => (
                <ItemCard
                  key={item.id}
                  item={{
                    ...item,
                    imageUrl: item.image_url,
                    sellerName: item.seller_name,
                    sellerVerified: item.seller_verified,
                    savedCount: item.saved_count,
                    viewCount: item.view_count,
                  }}
                  onView={(item) => navigate(`/marketplace/item/${item.id}`)}
                  onSave={handleSaveItem}
                  isSaved={savedItems.has(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── My Activity Summary ── */}
        <div className="dashboard__section">
          <div className="section-header">
            <span className="section-title">My Activity</span>
          </div>
          <div className="dashboard__activity-grid card">
            {[
              { icon: FiPackage, label: 'Active Listings', value: stats?.active_listings ?? 0, to: '/my-listings', color: 'var(--color-blue)' },
              { icon: FiTrendingUp, label: 'Completed Sales', value: stats?.completed_sales ?? 0, to: '/my-listings', color: 'var(--color-green-text)' },
              { icon: FiCheckCircle, label: 'Purchases', value: stats?.total_purchases ?? 0, to: '/purchases', color: 'var(--color-orange-text)' },
            ].map((a) => (
              <button
                key={a.label}
                className="dashboard__activity-item"
                onClick={() => navigate(`/marketplace${a.to}`)}
                type="button"
              >
                <a.icon size={18} color={a.color} />
                <span className="dashboard__activity-value">{a.value}</span>
                <span className="dashboard__activity-label">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
