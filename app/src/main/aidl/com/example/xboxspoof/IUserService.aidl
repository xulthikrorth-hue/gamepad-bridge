package com.example.xboxspoof;

interface IUserService {
    void destroy() = 16777114;
    String listDevices() = 1;
    // mode: 0 = Xbox One controller, 1 = DualShock 4
    String start(String devPath, int mode) = 2;
    void stop() = 3;
    String status() = 4;
    // "running(0/1)|frames forwarded|note"
    String stats() = 5;
}
