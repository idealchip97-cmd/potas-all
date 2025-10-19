import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FileText, AlertTriangle, TrendingUp, Camera, Zap } from 'lucide-react';
import { SpeedViolationReport } from './SpeedViolationReport';
import { RadarPerformanceReport } from './RadarPerformanceReport';
import { EnhancedSpeedGraphs } from './EnhancedSpeedGraphs';

const ReportSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState('graphs');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="graphs" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Speed Graphs
              </TabsTrigger>
              <TabsTrigger value="violations" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Violation Report
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Radar Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graphs" className="space-y-6">
              <EnhancedSpeedGraphs />
            </TabsContent>

            <TabsContent value="violations" className="space-y-6">
              <SpeedViolationReport />
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <RadarPerformanceReport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportSystem;
