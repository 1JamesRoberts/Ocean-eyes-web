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

// Keep credential-free fixture and CI builds working. Production setups place
// the gitignored file here (normally via `flutterfire configure`).
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Flutter writes GeneratedPluginRegistrant.java into the app source tree.
// A normal release build filters dev-only plugins, but a prior pub get or an
// IDE can leave the debug registrant in place when Gradle starts with cached
// inputs. Regenerate it through Flutter immediately before release Java
// compilation so integration_test never becomes a release compile dependency.
val flutterSdkPath = rootProject.file("local.properties").let { localPropertiesFile ->
    val localProperties = Properties()
    localPropertiesFile.inputStream().use(localProperties::load)
    localProperties.getProperty("flutter.sdk")
        ?: error("flutter.sdk not set in local.properties")
}
val flutterExecutable = File(
    flutterSdkPath,
    "bin/flutter${if (System.getProperty("os.name").startsWith("Windows")) ".bat" else ""}",
)
val releaseFlutterConfig = tasks.register<Exec>("generateReleaseFlutterConfig") {
    workingDir(rootProject.projectDir.parentFile)
    commandLine(
        flutterExecutable.absolutePath,
        "build",
        "apk",
        "--release",
        "--config-only",
    )
    inputs.file(rootProject.file("../.flutter-plugins-dependencies"))
    outputs.file(file("src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java"))
    outputs.upToDateWhen { false }
}
tasks.matching {
    it.name == "compileReleaseJavaWithJavac" || it.name == "compileReleaseKotlin"
}.configureEach {
    dependsOn(releaseFlutterConfig)
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
