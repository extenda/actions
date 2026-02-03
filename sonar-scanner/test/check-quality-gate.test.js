import axios from 'axios';
import path from 'path';

jest.mock('axios');
jest.mock('../src/sonar-credentials');

import { checkQualityGate } from '../src/check-quality-gate.js';

describe('Check Quality Gate', () => {
  test('Wait for OK', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { task: { status: 'PENDING', analysisId: '1' } },
      })
      .mockResolvedValueOnce({
        data: { task: { status: 'SUCCESS', analysisId: '1' } },
      })
      .mockResolvedValueOnce({ data: { projectStatus: { status: 'OK' } } });

    const status = await checkQualityGate(
      path.join(__dirname, 'report-task.txt'),
      0,
    );
    expect(status).toHaveProperty('statusCode', 0);
  });

  test('Wait for not OK', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { task: { status: 'PENDING', analysisId: '1' } },
      })
      .mockResolvedValueOnce({
        data: { task: { status: 'SUCCESS', analysisId: '1' } },
      })
      .mockResolvedValueOnce({ data: { projectStatus: { status: 'ERROR' } } });

    const status = await checkQualityGate(
      path.join(__dirname, 'report-task.txt'),
      0,
    );
    expect(status).toHaveProperty('statusCode', 1);
  });

  test('Wait for CANCELLED', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { task: { status: 'PENDING', analysisId: '1' } },
      })
      .mockResolvedValueOnce({
        data: { task: { status: 'CANCELLED', analysisId: '1' } },
      });

    const status = await checkQualityGate(
      path.join(__dirname, 'report-task.txt'),
      0,
    );
    expect(status.statusCode).toBeGreaterThan(1);
  });

  test('Wait for FAILED', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { task: { status: 'PENDING', analysisId: '1' } },
      })
      .mockResolvedValueOnce({
        data: { task: { status: 'FAILED', analysisId: '1' } },
      });

    const status = await checkQualityGate(
      path.join(__dirname, 'report-task.txt'),
      0,
    );
    expect(status.statusCode).toBeGreaterThan(1);
  });
});
