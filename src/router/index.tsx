import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Dashboard from '@/pages/Dashboard'
import GIS from '@/pages/GIS'
import LoginPage from '@/pages/login/index'
import RegisterPage from '@/pages/register/index'
import Growers from '@/pages/growers/index'
import BasicInfo from '@/pages/growers/BasicInfo'
import HandoverManagement from '@/pages/growers/HandoverManagement'
import Farms from '@/pages/farms/index'
import FarmDetail from '@/pages/farms/FarmDetail'
import Production from '@/pages/production/index'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'gis', element: <GIS /> },
      {
        path: 'growers',
        element: <Growers />,
        children: [
          { index: true, element: <Navigate to="basic-info" replace /> },
          { path: 'basic-info', element: <BasicInfo /> },
          { path: 'handover', element: <HandoverManagement /> },
        ],
      },
      { path: 'farms', element: <Farms /> },
      { path: 'farms/:id', element: <FarmDetail /> },
      { path: 'production', element: <Production /> },
    ],
  },
])

export default router
