import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Counter,
  DotGrid,
  SplitText,
  BlurText,
  FadeContent,
  AnimatedList,
  AnimatedListItem,
  LoadingSpinner
} from '@/components/bits'
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  AlertCircle,
  File,
  X,
  Database,
  Shield,
  Archive,
  RefreshCw,
  FileCheck
} from 'lucide-react'
import { getRequiredFiles, processUpload, getSources } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Upload() {
  const navigate = useNavigate()
  const [requiredFiles, setRequiredFiles] = useState([])
  const [currentSources, setCurrentSources] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [reqData, sourcesData] = await Promise.all([
        getRequiredFiles(),
        getSources().catch(() => null)
      ])

      setRequiredFiles(reqData.required_files)

      if (sourcesData && sourcesData.summary && sourcesData.summary.loaded_files > 0) {
        setCurrentSources(sourcesData)
      }
    } catch (err) {
      setError(err.message || 'Endpoint not available')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleFileInput = (e) => {
    handleFiles(Array.from(e.target.files))
  }

  const handleFiles = (newFiles) => {
    setError(null)
    setSelectedFiles(prev => {
      const combined = [...prev, ...newFiles]
      // Deduplicate by name
      const unique = []
      const names = new Set()
      for (const f of combined) {
        if (!names.has(f.name)) {
          names.add(f.name)
          unique.push(f)
        }
      }
      return unique
    })
  }

  const removeFile = (fileName) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName))
  }

  const getFileStatus = (expectedName) => {
    return selectedFiles.find(f => f.name.toLowerCase() === expectedName.toLowerCase())
  }

  const missingFiles = requiredFiles.filter(rf => !getFileStatus(rf.file_name))
  const canSubmit = missingFiles.length === 0 && selectedFiles.length > 0

  const handleUpload = async () => {
    if (!canSubmit) return

    setIsUploading(true)
    setError(null)
    setUploadProgress({ phase: 'Validating files...', percent: 10 })

    try {
      // Simulate progress updates
      setTimeout(() => setUploadProgress({ phase: 'Creating backup...', percent: 30 }), 500)
      setTimeout(() => setUploadProgress({ phase: 'Replacing files...', percent: 50 }), 1000)
      setTimeout(() => setUploadProgress({ phase: 'Recalculating readiness...', percent: 70 }), 1500)

      const result = await processUpload(selectedFiles)

      setUploadProgress({ phase: 'Complete!', percent: 100 })

      // Success! Redirect to Dashboard
      setTimeout(() => {
        navigate('/', { state: { successMessage: result.message || 'Data upload successful - readiness engine refreshed' } })
      }, 500)
    } catch (err) {
      setError(err.message || 'Upload failed')
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading requirements..." />
      </div>
    )
  }

  if (error && requiredFiles.length === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h3 className="text-lg font-medium text-red-900">Data unavailable</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  // Prepare checklist items for AnimatedList
  const checklistItems = requiredFiles.map(rf => {
    const found = getFileStatus(rf.file_name)
    return {
      id: rf.file_name,
      file: rf,
      found,
      variant: found ? 'success' : 'default'
    }
  })

  // Prepare staged files for AnimatedList
  const stagedItems = selectedFiles.map((f, idx) => {
    const isRequired = requiredFiles.some(rf => rf.file_name.toLowerCase() === f.name.toLowerCase())
    return {
      id: `${f.name}-${idx}`,
      file: f,
      isRequired
    }
  })

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Hero Section */}
      <DotGrid dotColor="blue" dotSize="sm" spacing="normal" opacity={15}>
        <div className="py-12 px-6 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 shadow-xl">
          <FadeContent direction="up" duration={0.8}>
            <div className="text-center space-y-4">
              <div className="inline-block">
                <SplitText
                  text="DATA UPLOAD COMMAND CENTER"
                  as="h1"
                  className="text-2xl md:text-3xl font-bold text-white tracking-wide"
                  stagger={0.02}
                />
              </div>

              <BlurText
                text="Securely replace current dataset and recalculate readiness across all subjects"
                as="p"
                className="text-base text-blue-200 max-w-2xl mx-auto"
                delay={0.5}
                duration={0.8}
              />

              {/* Current System Status */}
              {currentSources && (
                <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-200 pt-6 border-t border-blue-800">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <Counter value={currentSources.summary.loaded_files} className="font-semibold text-white" /> Files Active
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    <Counter value={currentSources.summary.total_rows} className="font-semibold text-white" /> Rows
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-400" />
                    <span className="text-green-300">System Active</span>
                  </div>
                </div>
              )}
            </div>
          </FadeContent>
        </div>
      </DotGrid>

      {/* Current System Alert */}
      {currentSources && selectedFiles.length === 0 && (
        <FadeContent delay={0.2}>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-blue-900">
                  Readiness Engine: Operational
                </h3>
                <p className="mt-2 text-sm text-blue-800 leading-relaxed">
                  Currently processing <strong><Counter value={currentSources.summary.total_subjects} /> subjects</strong> across <strong>{currentSources.summary.loaded_files} data files</strong>.
                </p>
                <p className="mt-2 text-sm text-blue-700 font-medium">
                  Upload new files below only if you need to replace the current dataset with updated monthly extracts.
                </p>
              </div>
            </div>
          </div>
        </FadeContent>
      )}

      {/* Error Alert */}
      {error && (
        <FadeContent>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Upload Validation Failed</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </FadeContent>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <FadeContent>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{uploadProgress.phase}</p>
                      <p className="text-sm text-slate-600">Please wait...</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-blue-600">
                    <Counter value={uploadProgress.percent} suffix="%" duration={500} />
                  </div>
                </div>

                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeContent>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Drag & Drop Zone */}
        <FadeContent delay={0.3} className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8">
              <div
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300',
                  isDragging
                    ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                  isDragging ? "bg-blue-100 scale-110" : "bg-slate-100"
                )}>
                  <UploadCloud className={cn(
                    "h-8 w-8 transition-colors duration-300",
                    isDragging ? "text-blue-600" : "text-slate-400"
                  )} />
                </div>

                <h3 className="text-xl font-semibold text-slate-900">
                  {isDragging ? 'Drop files here' : 'Drag & drop clinical data files'}
                </h3>
                <p className="mt-2 text-sm text-slate-500 mb-6 max-w-md">
                  Excel (.xlsx) and CSV (.csv) formats supported • All 7 required files must be provided
                </p>

                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="lg"
                  className="shadow-sm"
                >
                  <File className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeContent>

        {/* Required Files Checklist */}
        <FadeContent delay={0.4}>
          <Card className="border-slate-200 shadow-sm h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Required Files</CardTitle>
                  <CardDescription>
                    <Counter value={checklistItems.filter(i => i.found).length} /> of <Counter value={requiredFiles.length} /> uploaded
                  </CardDescription>
                </div>
                {checklistItems.filter(i => i.found).length === requiredFiles.length && (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedList
                items={checklistItems}
                renderItem={(item) => (
                  <div className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-all duration-300",
                    item.found
                      ? "border-green-200 bg-green-50/50 shadow-sm"
                      : "border-slate-200 bg-white"
                  )}>
                    {item.found ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        item.found ? "text-slate-900" : "text-slate-600"
                      )}>
                        {item.file.file_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.file.description}
                      </p>
                    </div>
                  </div>
                )}
                direction="up"
                stagger={0.05}
                itemClassName="transition-all duration-300"
              />
            </CardContent>
          </Card>
        </FadeContent>

        {/* Staged Files */}
        <FadeContent delay={0.5}>
          <Card className="border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Staged Files</CardTitle>
              <CardDescription>
                <Counter value={selectedFiles.length} /> file{selectedFiles.length !== 1 ? 's' : ''} ready for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {selectedFiles.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Archive className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm text-center font-medium text-slate-500">No files staged</p>
                  <p className="text-xs text-center text-slate-400 mt-1">Drag files above to begin</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {stagedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                          <File className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.file.name}</p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!item.isRequired && (
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Extra
                          </span>
                        )}
                        <button
                          onClick={() => removeFile(item.file.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-auto pt-6 space-y-3">
                {missingFiles.length > 0 && selectedFiles.length > 0 && (
                  <div className="text-xs text-center text-red-700 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="h-4 w-4 inline mr-1.5" />
                    Missing <Counter value={missingFiles.length} /> required file{missingFiles.length > 1 ? 's' : ''}
                  </div>
                )}

                <Button
                  className="w-full hero-gradient text-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  disabled={!canSubmit || isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing & Recalculating...
                    </span>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Replace Data & Refresh Engine
                    </>
                  )}
                </Button>

                {canSubmit && !isUploading && (
                  <p className="text-xs text-center text-slate-500">
                    <Shield className="h-3 w-3 inline mr-1" />
                    Automatic backup created before replacement
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeContent>
      </div>

      {/* Safety Information */}
      <FadeContent delay={0.7}>
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              Upload Safety & Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Automatic Backup</p>
                  <p className="text-xs text-slate-600 mt-0.5">Current data backed up before replacement</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Validation First</p>
                  <p className="text-xs text-slate-600 mt-0.5">Files validated before any changes</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Auto Rollback</p>
                  <p className="text-xs text-slate-600 mt-0.5">Automatic restore on validation failure</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeContent>
    </div>
  )
}
