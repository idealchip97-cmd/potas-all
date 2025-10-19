import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TrendingUp, Calendar, Download, Printer, RefreshCw, Camera } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

interface SpeedDataPoint {
  time: string;
  averageSpeed: number;
  vehicleCount: number;
  violations: number;
  [key: string]: string | number;
}

export const EnhancedSpeedGraphs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [graphData, setGraphData] = useState<SpeedDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphType, setGraphType] = useState<'speed' | 'volume' | 'violations'>('speed');
  const printRef = useRef<HTMLDivElement>(null);

  // Mock camera data
  const allCameras = ['CAM001', 'CAM002', 'CAM003', 'CAM004', 'CAM005'];

  // Progressive enabling logic
  const canGenerate = (activeTab === 'single' && selectedCamera && startDate && endDate) ||
                     (activeTab === 'multi' && selectedCameras.length > 0 && startDate && endDate);

  const hasGeneratedData = graphData.length > 0;

  // Generate mock speed data
  const generateSpeedData = (cameras: string[], start: string, end: string): SpeedDataPoint[] => {
    const data: SpeedDataPoint[] = [];
    const startTime = new Date(start);
    const endTime = new Date(end);
    const hoursDiff = differenceInHours(endTime, startTime);
    
    for (let i = 0; i <= hoursDiff; i++) {
      const currentTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const timeStr = format(currentTime, 'yyyy-MM-dd HH:mm');
      
      const dataPoint: SpeedDataPoint = {
        time: timeStr,
        averageSpeed: Math.floor(Math.random() * 40) + 30, // 30-70 km/h
        vehicleCount: Math.floor(Math.random() * 50) + 10, // 10-60 vehicles
        violations: Math.floor(Math.random() * 5), // 0-5 violations
      };

      // Add camera-specific data
      cameras.forEach(camera => {
        dataPoint[`${camera}_speed`] = Math.floor(Math.random() * 40) + 30;
        dataPoint[`${camera}_count`] = Math.floor(Math.random() * 50) + 10;
        dataPoint[`${camera}_violations`] = Math.floor(Math.random() * 5);
      });

      data.push(dataPoint);
    }
    
    return data;
  };

  const handleGenerateGraph = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const cameras = activeTab === 'single' ? [selectedCamera!] : selectedCameras;
      const data = generateSpeedData(cameras, startDate, endDate);
      setGraphData(data);
    } catch (error) {
      console.error('Error generating graph:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      if (printRef.current) {
        const canvas = await html2canvas(printRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('speed-graphs.pdf');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const renderGraph = () => {
    if (!hasGeneratedData) return null;

    const getYAxisKey = () => {
      switch (graphType) {
        case 'speed': return 'averageSpeed';
        case 'volume': return 'vehicleCount';
        case 'violations': return 'violations';
        default: return 'averageSpeed';
      }
    };

    const getYAxisLabel = () => {
      switch (graphType) {
        case 'speed': return 'Speed (km/h)';
        case 'volume': return 'Vehicle Count';
        case 'violations': return 'Violations';
        default: return 'Speed (km/h)';
      }
    };

    const cameras = activeTab === 'single' ? [selectedCamera!] : selectedCameras;

    return (
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => format(new Date(value), 'HH:mm')}
            />
            <YAxis 
              label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
            />
            <Legend />
            {cameras.map((camera, index) => (
              <Line
                key={camera}
                type="monotone"
                dataKey={activeTab === 'single' ? getYAxisKey() : `${camera}_${graphType === 'speed' ? 'speed' : graphType === 'volume' ? 'count' : 'violations'}`}
                stroke={`hsl(${index * 60}, 70%, 50%)`}
                strokeWidth={2}
                name={activeTab === 'single' ? getYAxisLabel() : `${camera} ${getYAxisLabel()}`}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Speed & Traffic Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'single' | 'multi')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Camera</TabsTrigger>
              <TabsTrigger value="multi">Multi Camera</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Select Camera</Label>
                  <Select
                    value={selectedCamera || ""}
                    onValueChange={(value: string) => setSelectedCamera(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select camera..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allCameras.map(camera => (
                        <SelectItem key={camera} value={camera}>
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            {camera}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate ? startDate.split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(`${e.target.value}T00:00`)}
                    disabled={!selectedCamera}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate ? endDate.split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(`${e.target.value}T23:00`)}
                    disabled={!selectedCamera || !startDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Graph Type</Label>
                  <Select
                    value={graphType}
                    onValueChange={(value: string) => setGraphType(value as 'speed' | 'volume' | 'violations')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speed">Average Speed</SelectItem>
                      <SelectItem value="volume">Vehicle Count</SelectItem>
                      <SelectItem value="violations">Violations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="multi" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Select Cameras</Label>
                  <div className="space-y-2">
                    {allCameras.map(camera => (
                      <label key={camera} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCameras.includes(camera)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              setSelectedCameras([...selectedCameras, camera]);
                            } else {
                              setSelectedCameras(selectedCameras.filter(c => c !== camera));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{camera}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate ? startDate.split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(`${e.target.value}T00:00`)}
                    disabled={selectedCameras.length === 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate ? endDate.split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(`${e.target.value}T23:00`)}
                    disabled={selectedCameras.length === 0 || !startDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Graph Type</Label>
                  <Select
                    value={graphType}
                    onValueChange={(value: string) => setGraphType(value as 'speed' | 'volume' | 'violations')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speed">Average Speed</SelectItem>
                      <SelectItem value="volume">Vehicle Count</SelectItem>
                      <SelectItem value="violations">Violations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleGenerateGraph}
              disabled={!canGenerate || isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Graph'}
            </Button>

            {hasGeneratedData && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {hasGeneratedData && (
        <div ref={printRef}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'single' ? `${selectedCamera} - ` : 'Multi-Camera - '}
                {graphType === 'speed' ? 'Speed Analysis' : 
                 graphType === 'volume' ? 'Traffic Volume' : 'Violations Report'}
              </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">
                {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
              </Badge>
              <Badge variant="outline">
                {activeTab === 'single' ? '1 Camera' : `${selectedCameras.length} Cameras`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {renderGraph()}
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
};
