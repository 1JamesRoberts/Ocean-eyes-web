import java.io.File
import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseKeystoreProperties = Properties()
val releaseKeystorePropertiesFile = rootProject.file("key.properties")
if (releaseKeystorePropertiesFile.exists()) {
    FileInputStream(releaseKeystorePropertiesFile).use {
        releaseKeystoreProperties.load(it)
    }
    listOf("storeFile", "storePassword", "keyAlias", "keyPassword").forEach {
        if (releaseKeystoreProperties.getProperty(it).isNullOrBlank()) {
            throw GradleException("android/key.properties is missing $it")
        }
    }
    val configuredStoreFile = releaseKeystoreProperties.getProperty("storeFile")
    val releaseKeystoreFile = if (File(configuredStoreFile).isAbsolute) {
        File(configuredStoreFile)
    } else {
        file(configuredStoreFile)
    }
    if (!releaseKeystoreFile.isFile) {
        throw GradleException(
            "The release keystore was not found at ${releaseKeystoreFile.absolutePath}",
        )
    }
}

val releaseTaskRequested = gradle.startParameter.taskNames.any {
    it.contains("Release", ignoreCase = true)
}
if (releaseTaskRequested && !releaseKeystorePropertiesFile.isFile) {
    throw GradleException(
        "Customer release builds require android/key.properties and an approved release keystore.",
    )
}

android {
    namespace = "com.oceaneyes.oceaneyes"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // ONNX Runtime can memory-map uncompressed model assets on Android.
    androidResources {
        noCompress += "onnx"
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.oceaneyes.oceaneyes"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // flutter_webrtc (used by LiveKit) requires API 23 or newer.
        minSdk = maxOf(flutter.minSdkVersion, 23)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (releaseKeystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = releaseKeystoreProperties.getProperty("keyAlias")
                keyPassword = releaseKeystoreProperties.getProperty("keyPassword")
                storeFile = file(releaseKeystoreProperties.getProperty("storeFile"))
                storePassword = releaseKeystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            if (releaseKeystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

flutter {
    source = "../.."
}
