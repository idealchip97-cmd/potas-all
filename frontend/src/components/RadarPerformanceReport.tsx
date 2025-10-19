import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, FileText, Printer, Download, ChevronLeft, ChevronRight, Camera, Activity } from 'lucide-react';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { format } from 'date-fns';

interface RadarPerformanceData {
  id: string;
  dateTime: Date;
  cameraId: string;
  totalDetections: number;
  violations: number;
  averageSpeed: number;
  uptime: number;
  status: 'active' | 'maintenance' | 'offline';
  accuracy: number;
}

interface ReportFilters {
  startDate: Date | null;
  endDate: Date | null;
  selectedCameras: string[];
}

export const RadarPerformanceReport: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: null,
    endDate: null,
    selectedCameras: []
  });
  
  const [reportData, setReportData] = useState<RadarPerformanceData[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const ROWS_PER_PAGE = 24;

  // Pagination calculations
  const totalPages = Math.ceil(reportData.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentPageData = reportData.slice(startIndex, endIndex);

  // Get available cameras for dropdown
  const cameraOptions = [
    { value: 'camera001', label: 'Camera 001', isActive: true },
    { value: 'camera002', label: 'Camera 002', isActive: true },
    { value: 'camera003', label: 'Camera 003', isActive: false }
  ];

  // Progressive enabling logic
  const isEndDateEnabled = filters.startDate !== null;
  const isGenerateEnabled = filters.startDate !== null && filters.endDate !== null && filters.selectedCameras.length > 0;
  const isPrintEnabled = isGenerated && reportData.length > 0;

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value ? new Date(e.target.value) : null;
    setFilters(prev => ({
      ...prev,
      startDate: newStartDate,
      endDate: newStartDate && prev.endDate && prev.endDate < newStartDate ? null : prev.endDate
    }));
    setIsGenerated(false);
    setCurrentPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value ? new Date(e.target.value) : null;
    setFilters(prev => ({
      ...prev,
      endDate: newEndDate
    }));
    setIsGenerated(false);
    setCurrentPage(1);
  };

  const handleCamerasChange = (values: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedCameras: values
    }));
    setIsGenerated(false);
    setCurrentPage(1);
  };

  const handleGenerateReport = async () => {
    if (!isGenerateEnabled) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock data
      const mockData: RadarPerformanceData[] = Array.from({ length: 30 }, (_, i) => ({
        id: `performance_${i + 1}`,
        dateTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        cameraId: filters.selectedCameras[Math.floor(Math.random() * filters.selectedCameras.length)],
        totalDetections: Math.floor(Math.random() * 1000) + 100,
        violations: Math.floor(Math.random() * 200) + 10,
        averageSpeed: Math.floor(Math.random() * 30) + 40,
        uptime: Math.floor(Math.random() * 20) + 80,
        status: ['active', 'maintenance', 'offline'][Math.floor(Math.random() * 3)] as any,
        accuracy: Math.floor(Math.random() * 15) + 85
      }));
      
      setReportData(mockData);
      setIsGenerated(true);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">{status.toUpperCase()}</Badge>;
    }
    if (status === 'maintenance') {
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">{status.toUpperCase()}</Badge>;
    }
    return <Badge variant="destructive">{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Radar Performance Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Cameras</label>
            <MultiSelectDropdown
              options={cameraOptions}
              selectedValues={filters.selectedCameras}
              onSelectionChange={handleCamerasChange}
              placeholder="Select cameras..."
              searchPlaceholder="Search cameras..."
              showSelectAll={true}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date & Hour</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    const currentHour = filters.startDate ? format(filters.startDate, "HH") : '00';
                    if (dateValue) {
                      const event = { target: { value: `${dateValue}T${currentHour}:00` } };
                      handleStartDateChange(event as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  className="flex-1"
                />
                <select
                  value={filters.startDate ? format(filters.startDate, "HH") : '00'}
                  onChange={(e) => {
                    const hour = e.target.value;
                    const currentDate = filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                    const event = { target: { value: `${currentDate}T${hour}:00` } };
                    handleStartDateChange(event as React.ChangeEvent<HTMLInputElement>);
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                >
                  {Array.from({length: 24}, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date & Hour</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    const currentHour = filters.endDate ? format(filters.endDate, "HH") : '23';
                    if (dateValue) {
                      const event = { target: { value: `${dateValue}T${currentHour}:00` } };
                      handleEndDateChange(event as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  disabled={!isEndDateEnabled}
                  className="flex-1"
                />
                <select
                  value={filters.endDate ? format(filters.endDate, "HH") : '23'}
                  onChange={(e) => {
                    const hour = e.target.value;
                    const currentDate = filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                    const event = { target: { value: `${currentDate}T${hour}:00` } };
                    handleEndDateChange(event as React.ChangeEvent<HTMLInputElement>);
                  }}
                  disabled={!isEndDateEnabled}
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                >
                  {Array.from({length: 24}, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={!isGenerateEnabled || isGenerating}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            
            <Button
              disabled={!isPrintEnabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Print as PDF
            </Button>
            
            <Button
              disabled={!isPrintEnabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print via Printer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isGenerated && reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Radar Performance Report - {filters.selectedCameras.length} Camera{filters.selectedCameras.length > 1 ? 's' : ''}
              <span className="text-sm font-normal ml-2">
                ({format(filters.startDate!, 'MMM dd, yyyy HH:mm')} - {format(filters.endDate!, 'MMM dd, yyyy HH:mm')})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Date Time</th>
                    <th>Camera</th>
                    <th>Total Detections</th>
                    <th>Violations</th>
                    <th>Average Speed</th>
                    <th>Uptime</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageData.map((record, index) => (
                    <tr key={startIndex + index} className="hover:bg-gray-50">
                      <td>{format(record.dateTime, 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td>
                        <Badge variant="outline" className="font-mono">
                          <Camera className="h-3 w-3 mr-1" />
                          {record.cameraId}
                        </Badge>
                      </td>
                      <td className="font-semibold">{record.totalDetections.toLocaleString()}</td>
                      <td className="text-red-600 font-semibold">{record.violations}</td>
                      <td>{record.averageSpeed} km/h</td>
                      <td className="text-blue-600 font-semibold">{record.uptime}%</td>
                      <td className="text-green-600 font-semibold">{record.accuracy}%</td>
                      <td>{getStatusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, reportData.length)} of {reportData.length} records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
