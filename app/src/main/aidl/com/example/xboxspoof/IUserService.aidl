package com.example.xboxspoof;

interface IUserService {
    void destroy() = 16777114;
    String listDevices() = 1;
    String start(String devPath, int mode) = 2;
    void stop() = 3;
    String status() = 4;
}
