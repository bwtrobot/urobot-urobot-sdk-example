package com.bwton.urobot.infrastructure.utils;

import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class YamlUtils {

    public static Object getValue(Path path, String key) throws IOException {
        Yaml yaml = new Yaml();

        Map<String, Object> map;

        try (InputStream in = Files.newInputStream(path)) {
            map = yaml.load(in);
        }

        String[] keys = key.split("\\.");
        Object current = map;

        for (String k : keys) {
            if (!(current instanceof Map)) {
                return null;
            }
            current = ((Map<?, ?>) current).get(k);
        }

        return current;
    }
}