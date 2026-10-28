package com.example.xboxspoof;

interface IUserService {
    void destroy() = 16777114;
    String listDevices();
    // mode: 0 = Xbox One controller, 1 = DualShock 4
    String start(String devPath, int mode);
    void stop();
    String status();
}
