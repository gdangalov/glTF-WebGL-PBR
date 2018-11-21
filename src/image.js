const ImagaType_Jpeg = "image/jpeg";
const ImageType_Hdr = "image/vnd.radiance";
const ImageType_Exr = "image/exr";

class gltfImage
{
    constructor(uri = undefined, type = gl.TEXTURE_2D, miplevel = 0, bufferView = undefined, name = undefined, mimeType = ImagaType_Jpeg, image = undefined)
    {
        this.uri = uri;
        this.bufferView = bufferView;
        this.mimeType = mimeType;
        this.image = image; // javascript image
        this.name = name;
        this.type = type; // nonstandard
        this.miplevel = miplevel; // nonstandard
    }

    fromJson(jsonImage, path = "")
    {
        fromKeys(this, jsonImage);

        if(this.uri !== undefined)
        {
            this.uri = path + this.uri;
        }
    }

    load(gltf, additionalFiles = undefined)
    {
        if (this.image !== undefined)
        {
            console.error("image has already been loaded");
            return;
        }

        this.image = this.mimeType === ImageType_Hdr ? new HDRImage() : new Image();
        const self = this;
        const promise = new Promise(function(resolve, reject)
        {
            self.image.onload = resolve;
            self.image.onerror = resolve;

            if (!self.setImageFromBufferView(gltf))
            if (!self.setImageFromFiles(additionalFiles))
            if (!self.setImageFromUri())
            {
                console.error("Was not able to resolve image with uri '%s'", self.uri);
                resolve();
            }
        });

        return promise;
    }

    setImageFromUri()
    {
        if (this.uri === undefined)
        {
            return false;
        }

        if (getExtension(this.uri) === "exr")
        {
            return this.setImageFromExrUri();
        }

        this.image.src = this.uri;
        return true;
    }

    setImageFromBufferView(gltf)
    {
        const view = gltf.bufferViews[this.bufferView];
        if (view === undefined)
        {
            return false;
        }

        const buffer = gltf.buffers[view.buffer].buffer;
        const array = new Uint8Array(buffer, view.byteOffset, view.byteLength);
        const blob = new Blob([array], { "type": this.mimeType });
        this.image.src = URL.createObjectURL(blob);
        return true;
    }

    setImageFromFiles(files)
    {
        if (this.uri === undefined || files === undefined)
        {
            return false;
        }

        let bufferFile;
        for (bufferFile of files)
        {
            if (bufferFile.name === this.uri)
            {
                break;
            }
        }

        if (bufferFile.name !== this.uri)
        {
            return false;
        }

        const reader = new FileReader();
        const self = this;
        reader.onloadend = function(event)
        {
            self.image.src = event.target.result;
        }
        reader.readAsDataURL(bufferFile);

        return true;
    }

    setImageFromExrUri()
    {
        const request = new XMLHttpRequest();
        request.responseType = "arraybuffer";

        const self = this;
        request.onload = function()
        {
            const data = request.response;
            const exrImage = new Module.EXRLoader(data);
            const imageBytes = exrImage.getBytes();
            const imageData = new ImageData(new Uint8ClampedArray(imageBytes), exrImage.width(), exrImage.height());
            self.image.src = self.getUriFromImageData(imageData);
        }

        request.open("GET", this.uri, true);
        request.send();
        return true;
    }

    getUriFromImageData(imagedata)
    {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = imagedata.width;
        canvas.height = imagedata.height;
        context.putImageData(imagedata, 0, 0);
        return canvas.toDataURL();
    }
};
