import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
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
import TaskConfig from '@/pages/production/TaskConfig'
import PlanList from '@/pages/production/PlanList'
import PlanCreate from '@/pages/production/PlanCreate'
import PlanDetail from '@/pages/production/PlanDetail'
import ImplementationList from '@/pages/production/ImplementationList'
import ImplementationDetail from '@/pages/production/ImplementationDetail'
import TaskList from '@/pages/production/TaskList'
import TaskDetail from '@/pages/production/TaskDetail'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
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
          { path: 'production/config', element: <TaskConfig /> },
          { path: 'production/plans', element: <PlanList /> },
          { path: 'production/plans/create', element: <PlanCreate /> },
          { path: 'production/plans/:id', element: <PlanDetail /> },
          { path: 'production/implementation', element: <ImplementationList /> },
          { path: 'production/implementation/:farmId', element: <ImplementationDetail /> },
          { path: 'production/tasks', element: <TaskList /> },
          { path: 'production/tasks/:taskId', element: <TaskDetail /> },
        ],
      },
    ],
  },
])

export default router
