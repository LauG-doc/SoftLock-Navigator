import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Subjects } from './pages/Subjects'
import { SubjectDetail } from './pages/SubjectDetail'
import { Sites } from './pages/Sites'
import { DataQuality } from './pages/DataQuality'
import { Upload } from './pages/Upload'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/data-quality" element={<DataQuality />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
