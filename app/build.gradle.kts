plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.xboxspoof"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.example.xboxspoof"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }
    buildFeatures { aidl = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("dev.rikka.shizuku:api:13.1.5")
    implementation("dev.rikka.shizuku:provider:13.1.5")
}
