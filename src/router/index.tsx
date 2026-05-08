import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import GIS from '@/pages/GIS'
import Growers from '@/pages/growers/index'
import Farms from '@/pages/farms/index'
import Production from '@/pages/production/index'

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <GIS /> },
      { path: 'growers', element: <Growers /> },
      { path: 'farms', element: <Farms /> },
      { path: 'production', element: <Production /> },
    ],
  },
])

export default router
