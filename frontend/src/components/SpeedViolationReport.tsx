import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, FileText, Printer, Download, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';
import { format } from 'date-fns';

interface ViolationReportData {
  id: string;
  dateTime: Date;
  cameraId: string;
  vehiclePlate: string;
  speedDetected: number;
  speedLimit: number;
  violationAmount: number;
  fineAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  imageUrl: string;
}

interface ReportFilters {
  startDate: Date | null;
  endDate: Date | null;
  selectedCamera: string | undefined;
}

export const SpeedViolationReport: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: null,
    endDate: null,
    selectedCamera: undefined
  });
  
  const [reportData, setReportData] = useState<ViolationReportData[]>([]);
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
    { value: 'camera001', label: 'Camera 001' },
    { value: 'camera002', label: 'Camera 002' },
    { value: 'all', label: 'All Cameras' }
  ];

  // Progressive enabling logic
  const isEndDateEnabled = filters.startDate !== null;
  const isGenerateEnabled = filters.startDate !== null && filters.endDate !== null && filters.selectedCamera !== undefined;
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

  const handleCameraChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      selectedCamera: value
    }));
    setIsGenerated(false);
    setCurrentPage(1);
  };

  const handleGenerateReport = async () => {
    if (!isGenerateEnabled) return;
    
    setIsGenerating(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock data for demonstration
      const mockData: ViolationReportData[] = Array.from({ length: 50 }, (_, i) => ({
        id: `violation_${i + 1}`,
        dateTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        cameraId: filters.selectedCamera === 'all' ? `camera00${Math.floor(Math.random() * 2) + 1}` : filters.selectedCamera!,
        vehiclePlate: `${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 9999)}`,
        speedDetected: Math.floor(Math.random() * 40) + 60,
        speedLimit: 50,
        violationAmount: Math.floor(Math.random() * 40) + 10,
        fineAmount: Math.floor(Math.random() * 200) + 50,
        status: ['pending', 'paid', 'overdue'][Math.floor(Math.random() * 3)] as any,
        imageUrl: `/api/violations/image_${i + 1}.jpg`
      }));
      
      setReportData(mockData);
      setIsGenerated(true);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPDF = () => {
    if (!isPrintEnabled) return;
    
    const generatePrintContent = () => {
      const header = `
        <div class="header">
          <h2>Speed Violation Report - ${filters.selectedCamera === 'all' ? 'All Cameras' : filters.selectedCamera}</h2>
          <p>Period: ${format(filters.startDate!, 'MMM dd, yyyy HH:mm')} - ${format(filters.endDate!, 'MMM dd, yyyy HH:mm')}</p>
          <p>Total Records: ${reportData.length}</p>
        </div>
      `;
      
      const tableRows = reportData.map(record => `
        <tr>
          <td>${format(record.dateTime, 'MMM dd, yyyy HH:mm:ss')}</td>
          <td>${record.cameraId}</td>
          <td>${record.vehiclePlate}</td>
          <td>${record.speedDetected} km/h</td>
          <td>${record.speedLimit} km/h</td>
          <td>${record.violationAmount} km/h</td>
          <td>$${record.fineAmount}</td>
          <td class="status-${record.status}">${record.status.toUpperCase()}</td>
        </tr>
      `).join('');
      
      return `
        ${header}
        <table>
          <thead>
            <tr>
              <th>Date Time</th>
              <th>Camera</th>
              <th>Plate Number</th>
              <th>Speed Detected</th>
              <th>Speed Limit</th>
              <th>Violation</th>
              <th>Fine Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Speed Violation Report - ${filters.selectedCamera}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h2 { margin: 0; color: #333; }
              .header p { margin: 5px 0; color: #666; }
              .status-pending { color: #f59e0b; font-weight: bold; }
              .status-paid { color: green; font-weight: bold; }
              .status-overdue { color: red; font-weight: bold; }
              @media print {
                body { margin: 10px; }
                th, td { padding: 4px; font-size: 10px; }
              }
            </style>
          </head>
          <body>
            ${generatePrintContent()}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrintPrinter = () => {
    if (!isPrintEnabled) return;
    
    const originalBody = document.body.innerHTML;
    const generatePrintContent = () => {
      const header = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">Speed Violation Report - ${filters.selectedCamera === 'all' ? 'All Cameras' : filters.selectedCamera}</h2>
          <p style="margin: 5px 0; color: #666;">Period: ${format(filters.startDate!, 'MMM dd, yyyy HH:mm')} - ${format(filters.endDate!, 'MMM dd, yyyy HH:mm')}</p>
          <p style="margin: 5px 0; color: #666;">Total Records: ${reportData.length}</p>
        </div>
      `;
      
      const tableRows = reportData.map(record => `
        <tr>
          <td>${format(record.dateTime, 'MMM dd, yyyy HH:mm:ss')}</td>
          <td>${record.cameraId}</td>
          <td>${record.vehiclePlate}</td>
          <td>${record.speedDetected} km/h</td>
          <td>${record.speedLimit} km/h</td>
          <td>${record.violationAmount} km/h</td>
          <td>$${record.fineAmount}</td>
          <td style="color: ${record.status === 'overdue' ? 'red' : record.status === 'paid' ? 'green' : '#f59e0b'}; font-weight: bold;">${record.status.toUpperCase()}</td>
        </tr>
      `).join('');
      
      return `
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          @media print {
            body { margin: 10px; }
            th, td { padding: 4px; font-size: 10px; }
          }
        </style>
        ${header}
        <table>
          <thead>
            <tr>
              <th>Date Time</th>
              <th>Camera</th>
              <th>Plate Number</th>
              <th>Speed Detected</th>
              <th>Speed Limit</th>
              <th>Violation</th>
              <th>Fine Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };
    
    document.body.innerHTML = generatePrintContent();
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'overdue') {
      return <Badge variant="destructive">{status.toUpperCase()}</Badge>;
    }
    if (status === 'paid') {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">{status.toUpperCase()}</Badge>;
    }
    return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Speed Violation Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Camera</label>
            <SearchableDropdown
              options={cameraOptions}
              value={filters.selectedCamera}
              onValueChange={handleCameraChange}
              placeholder="Search and select camera..."
              searchPlaceholder="Search camera..."
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const dateValue = e.target.value;
                    const currentHour = filters.endDate ? format(filters.endDate, "HH") : '23';
                    if (dateValue) {
                      const event = { target: { value: `${dateValue}T${currentHour}:00` } };
                      handleEndDateChange(event as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  disabled={!isEndDateEnabled}
                  className="flex-1"
                  min={filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : undefined}
                />
                <select
                  value={filters.endDate ? format(filters.endDate, "HH") : '23'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const hour = e.target.value;
                    const currentDate = filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : (filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
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
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <Calendar className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            
            <Button
              onClick={handlePrintPDF}
              disabled={!isPrintEnabled}
              variant="outline"
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <Download className="h-4 w-4" />
              Print as PDF
            </Button>
            
            <Button
              onClick={handlePrintPrinter}
              disabled={!isPrintEnabled}
              variant="outline"
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <Printer className="h-4 w-4" />
              Print via Printer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isGenerated && reportData.length > 0 && (
        <Card className="animate-in slide-in-from-bottom-4 fade-in-0 duration-700 shadow-lg border-0">
          <CardHeader>
            <CardTitle>
              Speed Violation Report - {filters.selectedCamera === 'all' ? 'All Cameras' : filters.selectedCamera}
              <span className="text-sm font-normal ml-2">
                ({format(filters.startDate!, 'MMM dd, yyyy HH:mm')} - {format(filters.endDate!, 'MMM dd, yyyy HH:mm')})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="violation-report-content">
              <div className="header">
                <h2>Speed Violation Report - {filters.selectedCamera === 'all' ? 'All Cameras' : filters.selectedCamera}</h2>
                <p>Period: {format(filters.startDate!, 'MMM dd, yyyy HH:mm')} - {format(filters.endDate!, 'MMM dd, yyyy HH:mm')}</p>
                <p>Total Records: {reportData.length}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full transition-all duration-300">
                  <thead>
                    <tr>
                      <th>Date Time</th>
                      <th>Camera</th>
                      <th>Plate Number</th>
                      <th>Speed Detected</th>
                      <th>Speed Limit</th>
                      <th>Violation</th>
                      <th>Fine Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageData.map((record, index) => (
                      <tr key={startIndex + index} className="transition-all duration-200 hover:bg-gray-50 hover:scale-[1.01] hover:shadow-sm">
                        <td>{format(record.dateTime, 'MMM dd, yyyy HH:mm:ss')}</td>
                        <td>
                          <Badge variant="outline" className="font-mono">
                            <Camera className="h-3 w-3 mr-1" />
                            {record.cameraId}
                          </Badge>
                        </td>
                        <td className="font-mono font-semibold">{record.vehiclePlate}</td>
                        <td className="text-red-600 font-semibold">{record.speedDetected} km/h</td>
                        <td>{record.speedLimit} km/h</td>
                        <td className="text-orange-600 font-semibold">+{record.violationAmount} km/h</td>
                        <td className="text-green-600 font-semibold">${record.fineAmount}</td>
                        <td>
                          {getStatusBadge(record.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, reportData.length)} of {reportData.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const distance = Math.abs(page - currentPage);
                          return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                        })
                        .map((page, index, filteredPages) => {
                          const prevPage = filteredPages[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="min-w-[2.5rem]"
                              >
                                {page}
                              </Button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerated && reportData.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No violation data found for the selected period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
