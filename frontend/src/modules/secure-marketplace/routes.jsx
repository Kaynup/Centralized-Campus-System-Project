import "./styles/globals.css";
import "./styles/components.css";


import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard";
import Marketplace from "./pages/Marketplace/Marketplace";
import ItemDetails from "./pages/ItemDetail/ItemDetail";
import ListItem from "./pages/ListItem/ListItem";
import MyListings from "./pages/MyListings/MyListings";
import Purchases from "./pages/Purchases/Purchases";
import Messages from "./pages/Messages/Messages";
import Conversation from "./pages/Conversation/Conversation";

export default function SecureMarketplaceRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="browse" element={<Marketplace />} />
      <Route path="item/:id" element={<ItemDetails />} />
      <Route path="list-item" element={<ListItem />} />
      <Route path="my-listings" element={<MyListings />} />
      <Route path="purchases" element={<Purchases />} />
      <Route path="messages" element={<Messages />} />
      <Route path="messages/:conversationId" element={<Conversation />} />
      <Route path="*" element={<Navigate to="/marketplace" replace />} />
    </Routes>
  );
}
