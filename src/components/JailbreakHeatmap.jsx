import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, Typography, Tabs, Tab, Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import Papa from 'papaparse';

const JailbreakHeatmap = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [dataSets, setDataSets] = useState({
    tf_ratio1: [],
    tf_ratio2: [],
    tf_ratio3: [],
    tf_ratio4: [],
    success_rates: [],
  });
  const [csvSample, setCsvSample] = useState([]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    // 탭 변경 시 해당 데이터로 샘플 업데이트
    switch (newValue) {
      case 0:
        setCsvSample(dataSets.tf_ratio1);
        break;
      case 1:
        setCsvSample(dataSets.tf_ratio2);
        break;
      case 2:
        setCsvSample(dataSets.tf_ratio3);
        break;
      case 3:
        setCsvSample(dataSets.tf_ratio4);
        break;
      case 4:
        setCsvSample(dataSets.success_rates);
        break;
      default:
        setCsvSample([]);
    }
  };

  useEffect(() => {
    const fetchCSV = (path) => {
      return new Promise((resolve, reject) => {
        Papa.parse(path, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            const processedData = results.data.map(row => {
              const newRow = {};
              Object.keys(row).forEach(key => {
                const cleanKey = key.trim();
                newRow[cleanKey] = row[key];
              });
              return newRow;
            });
            resolve(processedData);
          },
          error: (err) => {
            reject(err);
          },
        });
      });
    };

    const loadData = async () => {
      try {
        const [tf1, tf2, tf3, tf4, success] = await Promise.all([
          fetchCSV('/data/overall_tf_ratio.csv'),
          fetchCSV('/data/combined_tense_tf_ratio.csv'),
          fetchCSV('/data/combined_quantization_tf_ratio.csv'),
          fetchCSV('/data/combined_quantization_tense_tf_ratio.csv'),
          fetchCSV('/data/jailbreak_success_rates.csv'),
        ]);
        setDataSets({
          tf_ratio1: tf1,
          tf_ratio2: tf2,
          tf_ratio3: tf3,
          tf_ratio4: tf4,
          success_rates: success,
        });
        setCsvSample(tf1);
      } catch (error) {
        console.error('CSV 데이터 로딩 오류:', error);
      }
    };

    loadData();
  }, []);

  const getColorForValue = (value, type, qIndex) => {
    if (type === 'success') {
      if (value === 'F') return '#ffffff';
      if (value === 'T') return '#4caf50';
      return '#e0e0e0';
    } else {
      // 4번째 탭인 Quant-Tense의 색상 표현 변경
      if (selectedTab === 3) {
        if (value === -1) {
          return '#FFFFFF'; // 하얀색
        } else if (value === 0) {
          return '#0D47A1'; // 가장 진한 색 (다크 블루)
        } else if (value === 19) {
          return '#E3F2FD'; // 가장 연한 색 (라이트 블루)
        } else if (value >= 1 && value <= 18) {
          // 1~18 값에 따라 색상 농도 조절
          const colorScale = [
            '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3',
            '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#C5CAE9',
            '#9FA8DA', '#7986CB', '#5C6BC0', '#3F51B5', '#3949AB',
            '#303F9F', '#283593', '#1A237E'
          ];
          return colorScale[value - 1];
        } else {
          return '#FFFFFF'; // 기본적으로 하얀색
        }
      }

      if (value === 0) return '#ffffff'; // 실패: 하얀색

      // q1-q100을 10개 구간으로 나누어 색상 지정
      const colorGroups = [
        '#ff0000', // 빨강 (q1-q10)
        '#ff8c00', // 다크 오렌지 (q11-q20)
        '#ffd700', // 골드 (q21-q30)
        '#32cd32', // 라임그린 (q31-q40)
        '#00ff7f', // 스프링그린 (q41-q50)
        '#00ffff', // 시안 (q51-q60)
        '#0000ff', // 블루 (q61-q70)
        '#8a2be2', // 블루바이올렛 (q71-q80)
        '#ff00ff', // 마젠타 (q81-q90)
        '#ff1493', // 딥핑크 (q91-q100)
      ];

      const groupIndex = Math.floor(qIndex / 10);
      const baseColor = colorGroups[groupIndex] || '#ffffff';

      // 값에 따라 색상 농도 조절 (높은 값일수록 진한 색)
      // 기존 1~100 범위에 대한 색상 조절
      const opacity = value / 100;
      return `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    }
  };

  const renderHeatmap = (data, type = 'ratio') => {
    const qKeys = Array.from({ length: 100 }, (_, i) => `q${i + 1}`);

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: selectedTab === 4 ? '6rem' : (selectedTab === 3 ? '4rem' : '3rem'), height: '2rem', textAlign: 'right', paddingRight: '1rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Category</th>
              {/* q1 ~ q100 라벨 추가 */}
              {qKeys.map((key, i) => (
                <th key={i} style={{ width: '0.5rem', padding: '0.25rem', fontSize: '0.5rem', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                  {key.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td style={{ 
                  fontFamily: 'monospace', 
                  fontSize: (selectedTab === 3 || selectedTab === 4) ? '0.6rem' : '0.7rem',
                  fontWeight: '500', 
                  textAlign: 'right', 
                  paddingRight: '1rem',
                  whiteSpace: selectedTab === 4 ? 'nowrap' : 'normal',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {selectedTab === 3 
                    ? `${row.Quan || ''} ${row.Lang || ''} ${row.Tens || ''}` 
                    : row.All || 
                      (row.Quan ? `${row.Quan} ${row.Lang}` : 
                      (row.Tens ? `${row.Tens} ${row.Lang}` : row.Lang)) || 
                      `${row.experiment_number} ${row.target_model}`
                  }
                </td>
                {qKeys.map((qKey, index) => {
                  const value = row[qKey];
                  if (typeof value === 'undefined') return null;
                  const displayValue = type === 'success' ? value : parseFloat(value);
                  const color = getColorForValue(displayValue, type, index);
                  return (
                    <td key={index} style={{ padding: 0 }}>
                      <div
                        style={{
                          width: '100%',
                          height: '0.75rem',
                          backgroundColor: color,
                          border: '1px solid #e2e8f0',
                          transition: 'background-color 0.2s',
                        }}
                        title={type === 'success' ? `q${index + 1}: ${value === 'T' ? '성공' : '실패'}` : `q${index + 1}: ${displayValue}%`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* 범례 수정 */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight="500">
              {type === 'success' ? '성공률:' : selectedTab === 3 ? '0~19 구간별 색상:' : '구간별 색상:'}
            </Typography>
            {type !== 'success' ? (
              selectedTab === 3 ? (
                <>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0' }}></div>
                  <Typography variant="caption">-1: 하얀색</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#0D47A1' }}></div>
                  <Typography variant="caption">0: 가장 진한 색</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#E3F2FD' }}></div>
                  <Typography variant="caption">19: 가장 연한 색</Typography>
                </>
              ) : (
                <>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}></div>
                  <Typography variant="caption">실패 (0%)</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ff0000' }}></div>
                  <Typography variant="caption">Q1-Q10</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ff8c00' }}></div>
                  <Typography variant="caption">Q11-Q20</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ffd700' }}></div>
                  <Typography variant="caption">Q21-Q30</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#32cd32' }}></div>
                  <Typography variant="caption">Q31-Q40</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#00ff7f' }}></div>
                  <Typography variant="caption">Q41-Q50</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#00ffff' }}></div>
                  <Typography variant="caption">Q51-Q60</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#0000ff' }}></div>
                  <Typography variant="caption">Q61-Q70</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#8a2be2' }}></div>
                  <Typography variant="caption">Q71-Q80</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ff00ff' }}></div>
                  <Typography variant="caption">Q81-Q90</Typography>
                  <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ff1493' }}></div>
                  <Typography variant="caption">Q91-Q100</Typography>
                </>
              )
            ) : (
              <>
                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}></div>
                <Typography variant="caption">탈옥 실패 (F)</Typography>
                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#4caf50' }}></div>
                <Typography variant="caption">탈옥 성공 (T)</Typography>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const { tf_ratio1, tf_ratio2, tf_ratio3, tf_ratio4, success_rates } = dataSets;

  return (
    <Card sx={{ width: '100%' }}>
      <CardHeader
        title={
          <Typography variant="h5" component="div" align="center">
            Jailbreak 성공 패턴 분석
          </Typography>
        }
      />
      <CardContent>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          centered
        >
          <Tab label="Total ASR" />
          <Tab label="Lang-Tense" />
          <Tab label="Quant-Lang" />
          <Tab label="Quant-Tense" />
          <Tab label="T/F Maps" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {selectedTab === 0 && renderHeatmap(tf_ratio1, 'ratio')}
          {selectedTab === 1 && renderHeatmap(tf_ratio2, 'ratio')}
          {selectedTab === 2 && renderHeatmap(tf_ratio3, 'ratio')}
          {selectedTab === 3 && renderHeatmap(tf_ratio4, 'ratio')}
          {selectedTab === 4 && renderHeatmap(success_rates, 'success')}
        </Box>
        {/* CSV 전체 데이터 표시 */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" align="center">CSV 데이터 전체</Typography>
          <div style={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {csvSample[0] && Object.keys(csvSample[0]).map((key) => (
                    <TableCell
                      key={key}
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px',
                        ...(key === 'target_model' ? { width: '10rem', whiteSpace: 'nowrap' } : {})
                      }}
                    >
                      {key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvSample.map((row, index) => (
                  <TableRow key={index}>
                    {Object.entries(row).map(([key, value], idx) => (
                      <TableCell
                        key={idx}
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px',
                          ...(key === 'target_model' ? { width: '10rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {})
                        }}
                      >
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Box>
      </CardContent>
    </Card>
  );
};

export default JailbreakHeatmap;