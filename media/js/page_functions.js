
function getWindowHeight() {
    if (self.innerHeight) return self.innerHeight;
    if (document.documentElement && document.documentElement.clientHeight)
        return document.documentElement.clientHeight;
    if (document.body) return document.body.clientHeight;
        return 0;
}

function getWindowWidth() {
    if (self.innerWidth) return self.innerWidth;
    if (document.documentElement && document.documentElement.clientWidth)
        return document.documentElement.clientWidth;
    if (document.body) return document.body.clientWidth;
        return 0;
}

function on_load_func() {

}
