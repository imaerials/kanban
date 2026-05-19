import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { BoardViewPage } from './components/BoardViewPage';
import { TaskDetailPage } from './components/TaskDetailPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/board/:boardId" element={<BoardViewPage />} />
        <Route path="/board/:boardId/task/:taskId" element={<TaskDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
