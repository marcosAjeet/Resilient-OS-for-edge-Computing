const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('.'));

// Base values for memory and disk
const baseMemoryUsage = 82.5; // Middle of 81-84 range
const MIN_DISK_USAGE = 4;
const MAX_DISK_USAGE = 7;
const baseDiskUsage = (MIN_DISK_USAGE + MAX_DISK_USAGE) / 2; // 5.5%

// Endpoint to get system metrics
app.get('/api/metrics', async (req, res) => {
    try {
        const [cpuLoad, memory, networkStats, fsSize, diskIO] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.fsSize(),
            si.disksIO()
        ]);

        // Calculate network speed (always 0 as specified)
        const networkSpeed = 0;

        // Get the primary disk (usually C: on Windows)
        const primaryDisk = fsSize.find(disk => disk.mount === 'C:') || fsSize[0];
        
        // Calculate disk usage strictly between 4-7%
        const diskUsage = primaryDisk ? {
            total: primaryDisk.size,
            used: primaryDisk.used,
            free: primaryDisk.available,
            usagePercent: Math.min(MAX_DISK_USAGE, Math.max(MIN_DISK_USAGE, 
                baseDiskUsage + (Math.random() * 1.5 - 0.75)
            ))
        } : {
            total: 0,
            used: 0,
            free: 0,
            usagePercent: baseDiskUsage
        };

        // Calculate memory usage with fluctuation between 81-84%
        const memoryUsage = baseMemoryUsage + (Math.random() * 3 - 1.5);

        // Calculate CPU usage (capped at 20%)
        const cpuUsage = Math.min(20, cpuLoad.currentLoad);

        res.json({
            cpu: {
                usage: cpuUsage,
                cores: cpuLoad.cpus.map(cpu => Math.min(20, cpu.load))
            },
            memory: {
                total: memory.total,
                used: memory.used,
                free: memory.free,
                usagePercent: memoryUsage
            },
            network: {
                speed: networkSpeed,
                rx_bytes: networkStats[0]?.rx_bytes || 0,
                tx_bytes: networkStats[0]?.tx_bytes || 0
            },
            disk: {
                usage: diskUsage,
                iops: diskIO.tps || 0
            }
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});